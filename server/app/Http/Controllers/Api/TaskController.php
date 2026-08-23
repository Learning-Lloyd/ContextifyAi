<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\AuditLogService;
use App\Services\ExplanationService;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        private readonly WeatherService $weatherService,
        private readonly ExplanationService $explanationService,
        private readonly AuditLogService $auditLogService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => 'nullable|string|max:255',
            'sort' => 'nullable|in:priority_score,due_date,created_at,title,importance,urgency',
            'direction' => 'nullable|in:asc,desc',
            'status' => 'nullable|in:pending,completed',
            'category' => 'nullable|string|max:100',
            'priority_level' => 'nullable|in:high,medium,low',
            'archived' => 'nullable|boolean',
        ]);

        $query = $request->user()->tasks();

        $archived = filter_var($validated['archived'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($archived) {
            $query->archived();
        } else {
            $query->active();
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['category'])) {
            $query->where('category', $validated['category']);
        }

        if (! empty($validated['priority_level'])) {
            match ($validated['priority_level']) {
                'high' => $query->where('priority_score', '>=', 8),
                'medium' => $query->whereBetween('priority_score', [5, 7.99]),
                'low' => $query->where('priority_score', '<', 5),
                default => null,
            };
        }

        $sort = $validated['sort'] ?? 'priority_score';
        $direction = $validated['direction'] ?? 'desc';
        $query->orderBy($sort, $direction);

        if ($sort !== 'due_date') {
            $query->orderBy('due_date');
        }

        $tasks = $query->get()->map(fn (Task $task) => $this->formatTask($task));

        $categories = $request->user()->tasks()
            ->active()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        return response()->json([
            'tasks' => $tasks,
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateTask($request);
        $validated = $this->weatherService->applyWeatherToTaskData($validated);

        $task = $request->user()->tasks()->create($validated);

        $this->auditLogService->log($request->user()->id, 'task_create', $request, [
            'task_id' => $task->id,
            'title' => $task->title,
        ]);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $this->formatTask($task),
        ], 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);
        $this->refreshWeatherIfStale($task);

        return response()->json([
            'task' => $this->formatTask($task->fresh(), true),
        ]);
    }

    public function update(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $validated = $this->validateTask($request, false);
        $validated = $this->weatherService->applyWeatherToTaskData($validated);
        $task->update($validated);

        $this->auditLogService->log($request->user()->id, 'task_update', $request, [
            'task_id' => $task->id,
            'title' => $task->title,
        ]);

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $this->formatTask($task->fresh(), true),
        ]);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $this->auditLogService->log($request->user()->id, 'task_delete', $request, [
            'task_id' => $task->id,
            'title' => $task->title,
        ]);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully',
        ]);
    }

    public function toggleComplete(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update([
            'status' => $task->status === 'completed' ? 'pending' : 'completed',
        ]);

        $this->auditLogService->log($request->user()->id, 'task_toggle_complete', $request, [
            'task_id' => $task->id,
            'status' => $task->status,
        ]);

        return response()->json([
            'message' => 'Task status updated',
            'task' => $this->formatTask($task->fresh()),
        ]);
    }

    public function archive(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update(['archived_at' => now()]);

        $this->auditLogService->log($request->user()->id, 'task_archive', $request, [
            'task_id' => $task->id,
        ]);

        return response()->json([
            'message' => 'Task archived successfully',
            'task' => $this->formatTask($task->fresh()),
        ]);
    }

    public function restore(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $task->update(['archived_at' => null]);

        $this->auditLogService->log($request->user()->id, 'task_restore', $request, [
            'task_id' => $task->id,
        ]);

        return response()->json([
            'message' => 'Task restored successfully',
            'task' => $this->formatTask($task->fresh()),
        ]);
    }

    public function duplicate(Request $request, Task $task): JsonResponse
    {
        $this->authorizeTask($request, $task);

        $copy = $task->replicate(['archived_at']);
        $copy->title = $task->title . ' (Copy)';
        $copy->status = 'pending';
        $copy->archived_at = null;
        $copy->save();

        $this->auditLogService->log($request->user()->id, 'task_duplicate', $request, [
            'source_task_id' => $task->id,
            'new_task_id' => $copy->id,
        ]);

        return response()->json([
            'message' => 'Task duplicated successfully',
            'task' => $this->formatTask($copy),
        ], 201);
    }

    private function validateTask(Request $request, bool $requireTitle = true): array
    {
        $rules = [
            'title' => ($requireTitle ? 'required' : 'sometimes') . '|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'estimated_time_minutes' => 'nullable|integer|min:1|max:10080',
            'location' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'due_date' => ($requireTitle ? 'required' : 'sometimes') . '|date',
            'due_time' => 'nullable|date_format:H:i',
            'importance' => 'required|integer|min:1|max:10',
            'urgency' => 'required|integer|min:1|max:10',
            'urgency_manual' => 'sometimes|boolean',
            'time_availability' => 'required|integer|min:1|max:10',
            'current_workload' => 'required|integer|min:1|max:10',
            'status' => 'sometimes|in:pending,completed',
        ];

        $validated = $request->validate($rules);

        if (! ($validated['urgency_manual'] ?? false) && ! empty($validated['due_date'])) {
            $validated['urgency_manual'] = false;
        }

        return $validated;
    }

    private function authorizeTask(Request $request, Task $task): void
    {
        if ($task->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }

    private function refreshWeatherIfStale(Task $task): void
    {
        if (! $task->latitude || ! $task->longitude) {
            return;
        }

        $stale = ! $task->weather_last_updated || $task->weather_last_updated->lt(now()->subMinutes(30));
        if (! $stale) {
            return;
        }

        $weather = $this->weatherService->getWeather($task->latitude, $task->longitude);
        if (! $weather) {
            return;
        }

        $task->update([
            'weather_condition' => $weather['weather_condition'],
            'temperature' => $weather['temperature'],
            'rain_probability' => $weather['rain_probability'],
            'weather_last_updated' => now(),
        ]);
    }

    private function formatTask(Task $task, bool $withBreakdown = false): array
    {
        $data = [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'category' => $task->category,
            'notes' => $task->notes,
            'estimated_time_minutes' => $task->estimated_time_minutes,
            'location' => $task->location,
            'latitude' => $task->latitude,
            'longitude' => $task->longitude,
            'weather_condition' => $task->weather_condition,
            'temperature' => $task->temperature,
            'rain_probability' => $task->rain_probability,
            'weather_last_updated' => $task->weather_last_updated,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'due_time' => $task->due_time,
            'deadline_group' => $task->deadline_group,
            'countdown' => $task->countdown,
            'priority_level' => $task->priority_level,
            'importance' => $task->importance,
            'urgency' => $task->urgency,
            'urgency_manual' => $task->urgency_manual,
            'time_availability' => $task->time_availability,
            'current_workload' => $task->current_workload,
            'priority_score' => $task->priority_score,
            'status' => $task->status,
            'is_archived' => $task->is_archived,
            'archived_at' => $task->archived_at,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];

        if ($withBreakdown) {
            $data['breakdown'] = $task->breakdown;
            $data['explanation'] = $this->explanationService->forTask($data);
        }

        return $data;
    }
}

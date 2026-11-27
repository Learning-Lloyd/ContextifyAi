<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\AuditLogService;
use App\Services\TaskBreakdownService;
use App\Services\TaskScoringService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class TaskBreakdownController extends Controller
{
    public function __construct(
        private readonly TaskBreakdownService $service,
        private readonly TaskScoringService $taskScoringService,
        private readonly AuditLogService $auditLogService
    ) {}

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate(['task_id' => 'required|integer|exists:tasks,id']);
        $task = Task::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($validated['task_id']);

        $suggestions = $this->service->generate([
            'title' => $task->title,
            'description' => $task->description,
            'due_date' => $task->due_date?->format('Y-m-d'),
        ]);

        if ($suggestions === null) {
            return response()->json([
                'message' => $this->service->unavailableMessage(),
            ], 503);
        }

        return response()->json(['subtasks' => $suggestions]);
    }

    public function storeReviewed(Request $request, int $taskId): JsonResponse
    {
        $validated = $request->validate([
            'request_id' => 'required|uuid',
            'steps' => 'required|array|min:1|max:50',
            'steps.*.title' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string|max:10000',
        ]);

        $user = $request->user();
        $parentTask = $user->tasks()->active()->findOrFail($taskId);
        $fingerprint = hash('sha256', json_encode([
            'parent_task_id' => $parentTask->id,
            'steps' => $validated['steps'],
        ], JSON_THROW_ON_ERROR));
        $cacheKey = 'reviewed-task-steps:'.$user->id.':'.$validated['request_id'];

        try {
            $result = Cache::lock($cacheKey.':lock', 30)->block(5, function () use (
                $cacheKey,
                $fingerprint,
                $parentTask,
                $request,
                $user,
                $validated
            ): array {
                $cached = Cache::get($cacheKey);
                if (is_array($cached)) {
                    if (! hash_equals((string) ($cached['fingerprint'] ?? ''), $fingerprint)) {
                        return ['conflict' => true, 'replayed' => false, 'task_ids' => []];
                    }

                    return ['conflict' => false, 'replayed' => true, 'task_ids' => $cached['task_ids'] ?? []];
                }

                $taskIds = DB::transaction(function () use ($parentTask, $request, $user, $validated): array {
                    $dueDate = $parentTask->due_date?->format('Y-m-d');
                    $dueTime = $parentTask->due_time ? substr((string) $parentTask->due_time, 0, 5) : null;
                    $createdIds = [];

                    foreach ($validated['steps'] as $step) {
                        $title = trim($step['title']);
                        $description = isset($step['description']) ? trim($step['description']) : null;
                        $factors = $this->taskScoringService->resolveFactors($user, [
                            'title' => $title,
                            'description' => $description !== '' ? $description : null,
                            'due_date' => $dueDate,
                            'due_time' => $dueTime,
                        ], allowAi: false);

                        $created = $user->tasks()->create([
                            'title' => $title,
                            'description' => $description !== '' ? $description : null,
                            'category' => $parentTask->category,
                            'due_date' => $dueDate,
                            'due_time' => $dueTime,
                            'estimated_time_minutes' => null,
                            'location' => $parentTask->location,
                            'latitude' => $parentTask->latitude,
                            'longitude' => $parentTask->longitude,
                            'weather_condition' => $parentTask->weather_condition,
                            'temperature' => $parentTask->temperature,
                            'rain_probability' => $parentTask->rain_probability,
                            'weather_last_updated' => $parentTask->weather_last_updated,
                            'importance' => $factors['importance'],
                            'importance_source' => $factors['importance_analysis']['source'] ?? 'heuristic',
                            'urgency' => $factors['urgency'],
                            'urgency_manual' => false,
                            'time_availability' => $factors['time_availability'],
                            'current_workload' => $factors['current_workload'],
                            'status' => 'pending',
                        ]);

                        $createdIds[] = (int) $created->id;
                        $this->auditLogService->log($user->id, 'task_breakdown_step_create', $request, [
                            'parent_task_id' => $parentTask->id,
                            'task_id' => $created->id,
                        ]);
                    }

                    return $createdIds;
                });

                Cache::put($cacheKey, ['fingerprint' => $fingerprint, 'task_ids' => $taskIds], now()->addDay());

                return ['conflict' => false, 'replayed' => false, 'task_ids' => $taskIds];
            });
        } catch (LockTimeoutException) {
            return response()->json([
                'message' => 'A reviewed-step save is already processing. Wait briefly before retrying.',
            ], 409);
        }

        if ($result['conflict']) {
            return response()->json([
                'message' => 'This save request was already used for different reviewed steps. Please start a new save attempt.',
            ], 409);
        }

        $tasksById = $user->tasks()->whereIn('id', $result['task_ids'])->get()->keyBy('id');
        $rankedIds = $user->tasks()->active()->where('status', 'pending')
            ->orderByDesc('priority_score')
            ->orderByRaw('CASE WHEN due_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('due_date')
            ->orderByRaw("COALESCE(due_time, '23:59:59')")
            ->orderBy('id')
            ->pluck('id')
            ->values();
        $ranks = $rankedIds->mapWithKeys(fn ($id, $index) => [(int) $id => $index + 1]);
        $tasks = collect($result['task_ids'])->map(function (int $id) use ($tasksById, $ranks) {
            $task = $tasksById->get($id);
            if (! $task) {
                return null;
            }

            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'due_date' => $task->due_date?->format('Y-m-d'),
                'due_time' => $task->due_time ? substr((string) $task->due_time, 0, 5) : null,
                'estimated_time_minutes' => $task->estimated_time_minutes,
                'priority_score' => $task->priority_score,
                'priority_level' => $task->priority_level,
                'rank' => $ranks[$task->id] ?? null,
                'status' => $task->status,
            ];
        })->filter()->values();

        return response()->json([
            'message' => 'Reviewed steps added successfully.',
            'tasks' => $tasks,
        ], $result['replayed'] ? 200 : 201);
    }
}

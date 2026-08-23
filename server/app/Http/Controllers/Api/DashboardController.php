<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DecisionComparison;
use App\Models\Task;
use App\Services\DeadlineUrgencyService;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly WeatherService $weatherService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tasks = $user->tasks()->active()->orderByDesc('priority_score')->get();

        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'completed')->count();
        $pendingTasks = $tasks->where('status', 'pending')->count();
        $averageScore = round($tasks->avg('priority_score') ?? 0, 2);

        $highestPriorityTask = $tasks
            ->where('status', 'pending')
            ->sortByDesc('priority_score')
            ->first();

        $grouped = [
            'overdue' => [],
            'today' => [],
            'tomorrow' => [],
            'upcoming' => [],
        ];

        foreach ($tasks as $task) {
            $group = DeadlineUrgencyService::deadlineGroup($task->due_date?->format('Y-m-d'));
            $formatted = $this->formatTask($task);
            if (isset($grouped[$group])) {
                $grouped[$group][] = $formatted;
            }
        }

        $tasksDueToday = count($grouped['today']);
        $overdueCount = count($grouped['overdue']);
        $currentWorkload = round($tasks->where('status', 'pending')->avg('current_workload') ?? 0, 1);

        $upcomingDeadlines = $tasks
            ->where('status', 'pending')
            ->filter(fn (Task $task) => $task->due_date)
            ->sortBy('due_date')
            ->take(5)
            ->map(fn (Task $task) => $this->formatTask($task))
            ->values();

        $highestPriorityTasks = $tasks
            ->where('status', 'pending')
            ->sortByDesc('priority_score')
            ->take(5)
            ->map(fn (Task $task) => $this->formatTask($task))
            ->values();

        $decisionSummary = [
            'total_saved' => $user->decisionComparisons()->count(),
            'recent' => $user->decisionComparisons()
                ->latest()
                ->take(3)
                ->get()
                ->map(fn (DecisionComparison $decision) => [
                    'id' => $decision->id,
                    'recommended_task' => $decision->recommended_task,
                    'score_a' => $decision->score_a,
                    'score_b' => $decision->score_b,
                    'confidence' => $decision->confidence,
                    'created_at' => $decision->created_at,
                ]),
        ];

        $weather = $this->resolveDashboardWeather($request, $tasks);

        $allTasks = $tasks->map(fn (Task $task) => $this->formatTask($task));

        return response()->json([
            'user' => $user->only(['id', 'name', 'email', 'city', 'city_latitude', 'city_longitude']),
            'stats' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'pending_tasks' => $pendingTasks,
                'average_priority_score' => $averageScore,
                'tasks_due_today' => $tasksDueToday,
                'overdue_tasks' => $overdueCount,
                'current_workload' => $currentWorkload,
            ],
            'widgets' => [
                'upcoming_deadlines' => $upcomingDeadlines,
                'tasks_due_today' => $grouped['today'],
                'overdue_tasks' => $grouped['overdue'],
                'highest_priority_tasks' => $highestPriorityTasks,
                'current_workload' => $currentWorkload,
                'decision_history_summary' => $decisionSummary,
                'weather' => $weather,
            ],
            'grouped_tasks' => $grouped,
            'highest_priority_task' => $highestPriorityTask ? [
                'id' => $highestPriorityTask->id,
                'title' => $highestPriorityTask->title,
                'priority_score' => $highestPriorityTask->priority_score,
                'status' => $highestPriorityTask->status,
            ] : null,
            'tasks' => $allTasks,
        ]);
    }

    private function resolveDashboardWeather(Request $request, $tasks): ?array
    {
        $user = $request->user();

        if ($user->city_latitude && $user->city_longitude) {
            $current = $this->weatherService->getWeather((float) $user->city_latitude, (float) $user->city_longitude);
            if ($current) {
                return [
                    'location' => $user->city,
                    'latitude' => (float) $user->city_latitude,
                    'longitude' => (float) $user->city_longitude,
                    'temperature' => $current['temperature'],
                    'weather_condition' => $current['weather_condition'],
                    'rain_probability' => $current['rain_probability'],
                    'forecast' => $this->weatherService->getForecast((float) $user->city_latitude, (float) $user->city_longitude),
                    'source' => 'user_city',
                ];
            }
        }

        $lat = $request->query('latitude');
        $lon = $request->query('longitude');
        $location = $request->query('location');

        if (! $lat || ! $lon) {
            $taskWithLocation = $tasks->first(fn (Task $task) => $task->latitude && $task->longitude);
            if ($taskWithLocation) {
                $lat = $taskWithLocation->latitude;
                $lon = $taskWithLocation->longitude;
                $location = $taskWithLocation->location;
            }
        }

        if (! $lat || ! $lon) {
            return null;
        }

        $current = $this->weatherService->getWeather((float) $lat, (float) $lon);
        if (! $current) {
            return null;
        }

        return [
            'location' => $location,
            'latitude' => (float) $lat,
            'longitude' => (float) $lon,
            'temperature' => $current['temperature'],
            'weather_condition' => $current['weather_condition'],
            'rain_probability' => $current['rain_probability'],
            'forecast' => $this->weatherService->getForecast((float) $lat, (float) $lon),
        ];
    }

    private function formatTask(Task $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'category' => $task->category,
            'notes' => $task->notes,
            'estimated_time_minutes' => $task->estimated_time_minutes,
            'location' => $task->location,
            'weather_condition' => $task->weather_condition,
            'temperature' => $task->temperature,
            'rain_probability' => $task->rain_probability,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'due_time' => $task->due_time,
            'deadline_group' => $task->deadline_group,
            'countdown' => $task->countdown,
            'priority_level' => $task->priority_level,
            'importance' => $task->importance,
            'urgency' => $task->urgency,
            'time_availability' => $task->time_availability,
            'current_workload' => $task->current_workload,
            'priority_score' => $task->priority_score,
            'status' => $task->status,
            'is_archived' => $task->is_archived,
            'created_at' => $task->created_at,
            'updated_at' => $task->updated_at,
        ];
    }
}

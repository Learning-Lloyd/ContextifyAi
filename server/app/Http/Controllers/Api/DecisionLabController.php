<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DecisionAnalysis;
use App\Models\DecisionComparison;
use App\Models\Task;
use App\Services\AuditLogService;
use App\Services\DecisionService;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DecisionLabController extends Controller
{
    public function __construct(
        private readonly DecisionService $decisionService,
        private readonly AuditLogService $auditLogService,
        private readonly WeatherService $weatherService
    ) {
    }

    public function compare(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_a.id' => 'nullable|integer|exists:tasks,id',
            'task_a.title' => 'required_without:task_a.id|string|max:255',
            'task_a.description' => 'nullable|string',
            'task_a.importance' => 'required_without:task_a.id|integer|min:1|max:10',
            'task_a.urgency' => 'required_without:task_a.id|integer|min:1|max:10',
            'task_a.time_availability' => 'required_without:task_a.id|integer|min:1|max:10',
            'task_a.current_workload' => 'required_without:task_a.id|integer|min:1|max:10',

            'task_b.id' => 'nullable|integer|exists:tasks,id',
            'task_b.title' => 'required_without:task_b.id|string|max:255',
            'task_b.description' => 'nullable|string',
            'task_b.importance' => 'required_without:task_b.id|integer|min:1|max:10',
            'task_b.urgency' => 'required_without:task_b.id|integer|min:1|max:10',
            'task_b.time_availability' => 'required_without:task_b.id|integer|min:1|max:10',
            'task_b.current_workload' => 'required_without:task_b.id|integer|min:1|max:10',
        ]);

        $taskA = $this->resolveTaskInput($validated['task_a'], $request);
        $taskB = $this->resolveTaskInput($validated['task_b'], $request);

        return response()->json([
            'comparison' => $this->decisionService->compare($taskA, $taskB),
        ]);
    }

    public function analyze(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'task_ids' => 'required|array|min:1',
                'task_ids.*' => 'integer|exists:tasks,id',
            ]);

            $tasks = Task::whereIn('id', $validated['task_ids'])
                ->where('user_id', $request->user()->id)
                ->get();

            if ($tasks->count() !== count($validated['task_ids'])) {
                return response()->json([
                    'message' => 'One or more tasks are not authorized.',
                ], 403);
            }

            $payload = $tasks->map(fn (Task $task) => $this->taskToArray($task))->all();
            $weatherContext = $this->resolveUserWeatherContext($request);
            $analysis = $this->decisionService->prioritizeMultiple($payload, $weatherContext);

            $saved = $request->user()->decisionAnalyses()->create([
                'task_ids' => $validated['task_ids'],
                'ranked_tasks' => $analysis['ranked_tasks'],
                'summary' => array_merge($analysis['summary'] ?? [], [
                    'ai_explanation' => $analysis['ai_explanation'] ?? null,
                    'weather_context' => $analysis['weather_context'] ?? null,
                ]),
                'recommendation' => $analysis['recommendation'],
                'conflicts' => $analysis['conflicts'],
                'total_selected' => $analysis['total_selected'],
            ]);

            $this->auditLogService->log($request->user()->id, 'decision_analysis', $request, [
                'analysis_id' => $saved->id,
                'task_count' => $analysis['total_selected'],
            ]);

            return response()->json([
                'analysis' => $analysis,
                'analysis_id' => $saved->id,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Failed to analyze tasks. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function simulate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scenarios' => 'required|array|min:1',
            'scenarios.*.id' => 'nullable|integer',
            'scenarios.*.title' => 'required|string|max:255',
            'scenarios.*.description' => 'nullable|string',
            'scenarios.*.importance' => 'required|integer|min:1|max:10',
            'scenarios.*.urgency' => 'required|integer|min:1|max:10',
            'scenarios.*.time_availability' => 'required|integer|min:1|max:10',
            'scenarios.*.current_workload' => 'required|integer|min:1|max:10',
            'scenarios.*.due_date' => 'nullable|date',
            'scenarios.*.due_time' => 'nullable|date_format:H:i',
            'scenarios.*.location' => 'nullable|string|max:255',
            'scenarios.*.weather_condition' => 'nullable|string|max:255',
            'scenarios.*.temperature' => 'nullable|numeric',
            'scenarios.*.rain_probability' => 'nullable|numeric',
        ]);

        $scenarios = collect($validated['scenarios'])->map(function (array $scenario) use ($request) {
            if (! empty($scenario['id'])) {
                $task = Task::find($scenario['id']);
                if ($task && $task->user_id === $request->user()->id) {
                    return array_merge($this->taskToArray($task), $scenario);
                }
            }

            return $scenario;
        })->all();

        return response()->json([
            'analysis' => $this->decisionService->simulateWhatIf($scenarios, $this->resolveUserWeatherContext($request)),
            'simulated' => true,
        ]);
    }

    public function insights(Request $request): JsonResponse
    {
        $user = $request->user();
        $analyses = $user->decisionAnalyses()->latest()->take(50)->get();
        $comparisons = $user->decisionComparisons()->latest()->take(20)->get();

        $topTaskCounts = [];
        foreach ($analyses as $analysis) {
            $top = $analysis->ranked_tasks[0]['title'] ?? null;
            if ($top) {
                $topTaskCounts[$top] = ($topTaskCounts[$top] ?? 0) + 1;
            }
        }
        arsort($topTaskCounts);

        $confidenceCounts = ['high' => 0, 'medium' => 0, 'low' => 0];
        foreach ($comparisons as $comparison) {
            $level = $comparison->confidence ?? 'low';
            if (isset($confidenceCounts[$level])) {
                $confidenceCounts[$level]++;
            }
        }

        $recentAnalyses = $analyses->take(5)->map(fn (DecisionAnalysis $a) => [
            'id' => $a->id,
            'total_selected' => $a->total_selected,
            'top_task' => $a->ranked_tasks[0]['title'] ?? null,
            'top_score' => $a->ranked_tasks[0]['priority_score'] ?? null,
            'conflicts' => count($a->conflicts ?? []),
            'created_at' => $a->created_at,
        ]);

        return response()->json([
            'insights' => [
                'total_analyses' => $analyses->count(),
                'total_comparisons' => $comparisons->count(),
                'avg_tasks_per_analysis' => $analyses->count() > 0
                    ? round($analyses->avg('total_selected'), 1)
                    : 0,
                'total_conflicts_detected' => $analyses->sum(fn (DecisionAnalysis $a) => count($a->conflicts ?? [])),
                'most_frequent_top_task' => array_key_first($topTaskCounts),
                'confidence_distribution' => $confidenceCounts,
                'recent_analyses' => $recentAnalyses,
                'monthly_analyses' => $analyses
                    ->groupBy(fn (DecisionAnalysis $a) => $a->created_at->format('Y-m'))
                    ->map(fn ($group, $month) => ['month' => $month, 'count' => $group->count()])
                    ->values(),
            ],
        ]);
    }

    public function timeline(Request $request): JsonResponse
    {
        $analyses = $request->user()->decisionAnalyses()
            ->latest()
            ->get()
            ->map(fn (DecisionAnalysis $a) => [
                'id' => $a->id,
                'type' => 'analysis',
                'title' => 'Multi-task analysis (' . $a->total_selected . ' tasks)',
                'top_task' => $a->ranked_tasks[0]['title'] ?? null,
                'top_score' => $a->ranked_tasks[0]['priority_score'] ?? null,
                'total_selected' => $a->total_selected,
                'conflicts' => count($a->conflicts ?? []),
                'summary' => $a->summary,
                'created_at' => $a->created_at,
            ]);

        $comparisons = $request->user()->decisionComparisons()
            ->latest()
            ->get()
            ->map(fn (DecisionComparison $decision) => [
                'id' => $decision->id,
                'type' => 'comparison',
                'title' => ($decision->task_a['title'] ?? 'Task A') . ' vs ' . ($decision->task_b['title'] ?? 'Task B'),
                'recommended' => $decision->recommended_task === 'task_a'
                    ? ($decision->task_a['title'] ?? 'Task A')
                    : ($decision->recommended_task === 'task_b' ? ($decision->task_b['title'] ?? 'Task B') : 'Tie'),
                'confidence' => $decision->confidence,
                'score_difference' => $decision->score_difference,
                'explanation' => $decision->explanation,
                'created_at' => $decision->created_at,
            ]);

        $timeline = $analyses->concat($comparisons)
            ->sortByDesc('created_at')
            ->values()
            ->all();

        return response()->json(['timeline' => $timeline]);
    }

    public function analysisHistory(Request $request): JsonResponse
    {
        $analyses = $request->user()->decisionAnalyses()
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($analyses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_a' => 'required|array',
            'task_b' => 'required|array',
        ]);

        $comparison = $this->decisionService->compare($validated['task_a'], $validated['task_b']);

        $saved = $request->user()->decisionComparisons()->create([
            'task_a' => $comparison['task_a'],
            'task_b' => $comparison['task_b'],
            'score_a' => $comparison['score_a'],
            'score_b' => $comparison['score_b'],
            'recommended_task' => $comparison['recommended_task'],
            'score_difference' => $comparison['score_difference'],
            'confidence' => $comparison['confidence'],
            'explanation' => $comparison['explanation'],
        ]);

        return response()->json([
            'message' => 'Decision saved successfully',
            'decision' => $this->formatDecision($saved),
        ], 201);
    }

    public function history(Request $request): JsonResponse
    {
        $decisions = $request->user()
            ->decisionComparisons()
            ->latest()
            ->get()
            ->map(fn (DecisionComparison $decision) => $this->formatDecision($decision));

        return response()->json([
            'decisions' => $decisions,
        ]);
    }

    private function resolveTaskInput(array $input, Request $request): array
    {
        if (isset($input['id'])) {
            $task = Task::findOrFail($input['id']);
            if ($task->user_id !== $request->user()->id) {
                abort(403, 'Unauthorized task selection.');
            }

            return $this->taskToArray($task);
        }

        return $input;
    }

    private function taskToArray(Task $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'location' => $task->location,
            'latitude' => $task->latitude,
            'longitude' => $task->longitude,
            'weather_condition' => $task->weather_condition,
            'temperature' => $task->temperature,
            'rain_probability' => $task->rain_probability,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'due_time' => $task->due_time,
            'importance' => $task->importance,
            'urgency' => $task->urgency,
            'time_availability' => $task->time_availability,
            'current_workload' => $task->current_workload,
            'priority_score' => $task->priority_score,
            'status' => $task->status,
            'priority_level' => $task->priority_level,
            'countdown' => $task->countdown,
        ];
    }

    private function formatDecision(DecisionComparison $decision): array
    {
        return [
            'id' => $decision->id,
            'task_a' => $decision->task_a,
            'task_b' => $decision->task_b,
            'score_a' => $decision->score_a,
            'score_b' => $decision->score_b,
            'recommended_task' => $decision->recommended_task,
            'score_difference' => $decision->score_difference,
            'confidence' => $decision->confidence,
            'explanation' => $decision->explanation,
            'created_at' => $decision->created_at,
        ];
    }

    private function resolveUserWeatherContext(Request $request): ?array
    {
        $user = $request->user();
        if (! $user->city_latitude || ! $user->city_longitude) {
            return null;
        }

        $weather = $this->weatherService->getWeather((float) $user->city_latitude, (float) $user->city_longitude);
        if (! $weather) {
            return null;
        }

        return [
            'location' => $user->city,
            'weather_condition' => $weather['weather_condition'],
            'temperature' => $weather['temperature'],
            'rain_probability' => $weather['rain_probability'],
        ];
    }
}

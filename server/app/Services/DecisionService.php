<?php

namespace App\Services;

class DecisionService
{
    public function __construct(
        private readonly ExplanationService $explanationService,
        private readonly AiExplanationService $aiExplanationService
    ) {
    }

    public function compare(array $taskA, array $taskB): array
    {
        $normalizedA = $this->normalizeTask($taskA);
        $normalizedB = $this->normalizeTask($taskB);

        $breakdownA = PriorityCalculator::breakdown(
            $normalizedA['importance'],
            $normalizedA['urgency'],
            $normalizedA['time_availability'],
            $normalizedA['current_workload']
        );

        $breakdownB = PriorityCalculator::breakdown(
            $normalizedB['importance'],
            $normalizedB['urgency'],
            $normalizedB['time_availability'],
            $normalizedB['current_workload']
        );

        $scoreA = $breakdownA['final_score'];
        $scoreB = $breakdownB['final_score'];
        $difference = round(abs($scoreA - $scoreB), 2);

        $recommendedTask = $this->determineWinner($scoreA, $scoreB);
        $confidence = $this->confidenceFromDifference($difference);
        $reasonBullets = $recommendedTask === 'tie'
            ? []
            : $this->buildReasonBullets(
                $recommendedTask === 'task_a' ? $breakdownA : $breakdownB,
                $recommendedTask === 'task_a' ? $breakdownB : $breakdownA
            );
        $explanation = $this->buildExplanation(
            $normalizedA,
            $normalizedB,
            $scoreA,
            $scoreB,
            $recommendedTask,
            $difference,
            $reasonBullets
        );

        return [
            'task_a' => $normalizedA,
            'task_b' => $normalizedB,
            'score_a' => $scoreA,
            'score_b' => $scoreB,
            'recommended_task' => $recommendedTask,
            'score_difference' => $difference,
            'confidence' => $confidence,
            'explanation' => $explanation,
            'reason_bullets' => $reasonBullets,
            'breakdown' => [
                'task_a' => $breakdownA,
                'task_b' => $breakdownB,
            ],
            'comparison' => $this->factorComparison($normalizedA, $normalizedB),
        ];
    }

    /**
     * Rank unlimited selected tasks by deterministic weighted score.
     */
    public function prioritizeMultiple(array $tasks, ?array $weatherContext = null): array
    {
        $ranked = collect($tasks)
            ->map(function (array $task) {
                $normalized = $this->normalizeTask($task);
                $breakdown = PriorityCalculator::breakdown(
                    $normalized['importance'],
                    $normalized['urgency'],
                    $normalized['time_availability'],
                    $normalized['current_workload']
                );

                $normalized['priority_score'] = $breakdown['final_score'];
                $normalized['breakdown'] = $breakdown;
                $normalized['id'] = $task['id'] ?? null;
                $normalized['status'] = $task['status'] ?? null;

                return $normalized;
            })
            ->sortByDesc('priority_score')
            ->values()
            ->all();

        $conflicts = $this->detectSameDayConflicts($ranked);

        $ranked = collect($ranked)
            ->map(function (array $task, int $index) use ($ranked) {
                $task['rank'] = $index + 1;
                $task['explanation'] = $this->explanationService->forRankedTask($task, $task['rank']);

                $xai = $this->explanationService->forRankedTaskDetailed($task, $task['rank'], $ranked);
                $task = array_merge($task, $xai);

                if ($task['rank'] > 1 && isset($ranked[$index - 1])) {
                    $previous = $ranked[$index - 1];
                    $gap = round(($previous['priority_score'] ?? 0) - ($task['priority_score'] ?? 0), 2);
                    $task['rank_confidence'] = [
                        'level' => $this->confidenceFromDifference($gap),
                        'score_gap' => $gap,
                        'explanation' => $this->explanationService->confidenceExplanation(
                            $this->confidenceFromDifference($gap),
                            $gap
                        ),
                    ];
                }

                return $task;
            })
            ->all();

        $summary = $this->explanationService->buildDecisionSummary($ranked, $conflicts);
        $recommendation = $this->explanationService->buildActionRecommendation($ranked);
        $confidence = $this->computeAnalysisConfidence($ranked);
        $weatherContext = $weatherContext ?? $this->resolveWeatherContext($ranked);
        $aiExplanation = $this->aiExplanationService->explainRanking($ranked, $weatherContext);

        return [
            'ranked_tasks' => $ranked,
            'conflicts' => $conflicts,
            'total_selected' => count($ranked),
            'summary' => $summary,
            'recommendation' => $recommendation,
            'confidence' => $confidence,
            'ai_explanation' => $aiExplanation,
            'weather_context' => $weatherContext,
        ];
    }

    /**
     * What-if simulation: re-rank tasks with overridden factor values (no persistence).
     */
    public function simulateWhatIf(array $scenarios, ?array $weatherContext = null): array
    {
        return $this->prioritizeMultiple($scenarios, $weatherContext);
    }

    private function computeAnalysisConfidence(array $ranked): array
    {
        if (count($ranked) < 2) {
            return [
                'level' => 'high',
                'score_gap' => 0,
                'explanation' => 'Single task selected — ranking is definitive.',
            ];
        }

        $gap = round($ranked[0]['priority_score'] - $ranked[1]['priority_score'], 2);
        $level = $this->confidenceFromDifference($gap);

        return [
            'level' => $level,
            'score_gap' => $gap,
            'explanation' => $this->explanationService->confidenceExplanation($level, $gap),
        ];
    }

    /**
     * Detect tasks sharing the same due date and recommend execution order.
     */
    public function detectSameDayConflicts(array $tasks): array
    {
        return collect($tasks)
            ->filter(fn (array $task) => ! empty($task['due_date']))
            ->groupBy('due_date')
            ->filter(fn ($group) => $group->count() > 1)
            ->map(function ($group, $date) {
                $ordered = $group->sortByDesc('priority_score')->values()->all();
                $formattedDate = strtotime((string) $date) !== false
                    ? date('F j', strtotime((string) $date))
                    : (string) $date;

                return [
                    'date' => $date,
                    'count' => count($ordered),
                    'warning' => count($ordered) . ' tasks are due on ' . $formattedDate . '.',
                    'execution_order' => collect($ordered)->pluck('title')->all(),
                    'ranked_tasks' => $ordered,
                    'explanation' => $this->explanationService->forConflictGroup($date, count($ordered), $ordered),
                ];
            })
            ->values()
            ->all();
    }

    private function normalizeTask(array $task): array
    {
        return [
            'id' => $task['id'] ?? null,
            'title' => $task['title'] ?? 'Untitled Task',
            'description' => $task['description'] ?? null,
            'location' => $task['location'] ?? null,
            'weather_condition' => $task['weather_condition'] ?? null,
            'temperature' => $task['temperature'] ?? null,
            'rain_probability' => $task['rain_probability'] ?? null,
            'due_date' => ! empty($task['due_date']) ? (string) $task['due_date'] : null,
            'due_time' => $task['due_time'] ?? null,
            'importance' => max(1, min(10, (int) ($task['importance'] ?? 1))),
            'urgency' => max(1, min(10, (int) ($task['urgency'] ?? 1))),
            'time_availability' => max(1, min(10, (int) ($task['time_availability'] ?? 1))),
            'current_workload' => max(1, min(10, (int) ($task['current_workload'] ?? 1))),
        ];
    }

    private function determineWinner(float $scoreA, float $scoreB): string
    {
        if (abs($scoreA - $scoreB) < 0.01) {
            return 'tie';
        }

        return $scoreA > $scoreB ? 'task_a' : 'task_b';
    }

    private function confidenceFromDifference(float $difference): string
    {
        if ($difference >= 2) {
            return 'high';
        }

        if ($difference >= 1) {
            return 'medium';
        }

        return 'low';
    }

    private function buildExplanation(
        array $taskA,
        array $taskB,
        float $scoreA,
        float $scoreB,
        string $recommendedTask,
        float $difference,
        array $reasonBullets
    ): string {
        if ($difference < 0.5 || $recommendedTask === 'tie') {
            return 'Both tasks have very similar priority scores. Either choice is reasonable. Consider personal preference or external factors before deciding.';
        }

        $winnerKey = $recommendedTask === 'task_a' ? 'A' : 'B';
        $winnerScore = $recommendedTask === 'task_a' ? $scoreA : $scoreB;
        $loserScore = $recommendedTask === 'task_a' ? $scoreB : $scoreA;

        $topReasons = array_values(array_filter(
            $reasonBullets,
            fn (string $reason) => $reason !== 'Better overall weighted score'
        ));
        $topReasons = array_slice($topReasons, 0, 2);
        $topReasons = array_map(fn (string $reason) => strtolower($reason), $topReasons);
        $reasonSentence = count($topReasons) > 0
            ? ' Its ' . implode(' and ', $topReasons) . ' drive the stronger weighted outcome.'
            : '';

        return "Task {$winnerKey} has the higher priority score ({$winnerScore}) compared to " .
            $loserScore .
            ".{$reasonSentence} This makes it the better choice to complete first.";
    }

    private function buildReasonBullets(array $winnerBreakdown, array $loserBreakdown): array
    {
        $labels = [
            'importance' => 'Higher importance',
            'urgency' => 'Higher urgency',
            'time_availability' => 'Better time availability',
            'current_workload' => 'Higher workload-driven priority',
        ];

        $advantages = [];
        foreach (['importance', 'urgency', 'time_availability', 'current_workload'] as $factor) {
            $difference = round($winnerBreakdown[$factor]['weighted'] - $loserBreakdown[$factor]['weighted'], 2);
            if ($difference > 0) {
                $advantages[] = [
                    'factor' => $factor,
                    'difference' => $difference,
                ];
            }
        }

        usort($advantages, fn (array $a, array $b) => $b['difference'] <=> $a['difference']);
        $bullets = array_map(
            fn (array $item) => $labels[$item['factor']],
            array_slice($advantages, 0, 2)
        );

        $bullets[] = 'Better overall weighted score';

        return $bullets;
    }

    private function factorComparison(array $taskA, array $taskB): array
    {
        $factors = ['importance', 'urgency', 'time_availability', 'current_workload'];
        $result = [];

        foreach ($factors as $factor) {
            if ($taskA[$factor] === $taskB[$factor]) {
                $winner = 'tie';
            } else {
                $winner = $taskA[$factor] > $taskB[$factor] ? 'task_a' : 'task_b';
            }

            $result[$factor] = [
                'task_a' => $taskA[$factor],
                'task_b' => $taskB[$factor],
                'winner' => $winner,
            ];
        }

        return $result;
    }

    private function resolveWeatherContext(array $rankedTasks): ?array
    {
        $withWeather = collect($rankedTasks)->first(
            fn (array $task) => ! empty($task['weather_condition']) || ! empty($task['location'])
        );

        if (! $withWeather) {
            return null;
        }

        return [
            'location' => $withWeather['location'] ?? null,
            'weather_condition' => $withWeather['weather_condition'] ?? null,
            'temperature' => $withWeather['temperature'] ?? null,
            'rain_probability' => $withWeather['rain_probability'] ?? null,
        ];
    }
}

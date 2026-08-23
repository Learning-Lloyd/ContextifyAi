<?php

namespace App\Services;

class AiExplanationService
{
    public function __construct(private readonly AiClient $aiClient)
    {
    }

    /**
     * Generate natural-language explanation from already-computed ranking results.
     * AI must never alter scores, weights, or ranking order.
     */
    public function explainRanking(array $rankedTasks, ?array $weatherContext = null): array
    {
        if (count($rankedTasks) === 0) {
            return [
                'summary' => 'No tasks were selected for analysis.',
                'top_task_explanation' => null,
                'productivity_tips' => [],
                'weather_advice' => null,
                'source' => 'default',
            ];
        }

        $payload = $this->buildPayload($rankedTasks, $weatherContext);
        $aiResult = $this->explainWithAi($payload);

        if ($aiResult !== null) {
            return $aiResult;
        }

        return $this->explainWithHeuristic($rankedTasks, $weatherContext);
    }

    private function buildPayload(array $rankedTasks, ?array $weatherContext): array
    {
        $tasks = collect($rankedTasks)->map(function (array $task) {
            $breakdown = $task['breakdown'] ?? [];

            return [
                'rank' => $task['rank'] ?? null,
                'title' => $task['title'] ?? 'Untitled',
                'priority_score' => $task['priority_score'] ?? null,
                'priority_level' => $task['priority_level'] ?? null,
                'importance' => $task['importance'] ?? null,
                'urgency' => $task['urgency'] ?? null,
                'time_availability' => $task['time_availability'] ?? null,
                'current_workload' => $task['current_workload'] ?? null,
                'factor_contributions' => [
                    'importance' => $breakdown['importance']['weighted'] ?? null,
                    'urgency' => $breakdown['urgency']['weighted'] ?? null,
                    'time_availability' => $breakdown['time_availability']['weighted'] ?? null,
                    'current_workload' => $breakdown['current_workload']['weighted'] ?? null,
                ],
                'due_date' => $task['due_date'] ?? null,
            ];
        })->values()->all();

        return [
            'formula' => 'Priority = Importance×0.40 + Urgency×0.30 + Time Availability×0.20 + Workload×0.10',
            'tasks' => $tasks,
            'weather' => $weatherContext,
        ];
    }

    private function explainWithAi(array $payload): ?array
    {
        $system = <<<'PROMPT'
You explain deterministic task ranking results for Contextify. The scores and ranks are FINAL — never recalculate, change, or dispute them.

Return ONLY valid JSON:
{
  "summary": "<2-3 sentences on overall ranking>",
  "top_task_explanation": "<why rank #1 ranked first, referencing factor contributions>",
  "productivity_tips": ["<tip1>", "<tip2>"],
  "weather_advice": "<optional weather-based scheduling advice or null>"
}

Rules:
- Use ONLY the provided scores, ranks, and factor contributions
- Explain how importance, urgency, time availability, and workload affected outcomes
- Weather advice is advisory only and must not imply score changes
- Be concise and practical
PROMPT;

        $parsed = $this->aiClient->chatJson($system, json_encode($payload, JSON_PRETTY_PRINT));
        if ($parsed === null) {
            return null;
        }

        $summary = trim((string) ($parsed['summary'] ?? ''));
        if ($summary === '') {
            return null;
        }

        return [
            'summary' => $summary,
            'top_task_explanation' => trim((string) ($parsed['top_task_explanation'] ?? '')) ?: null,
            'productivity_tips' => array_values(array_filter((array) ($parsed['productivity_tips'] ?? []))),
            'weather_advice' => isset($parsed['weather_advice']) && $parsed['weather_advice']
                ? trim((string) $parsed['weather_advice'])
                : null,
            'source' => 'ai',
        ];
    }

    private function explainWithHeuristic(array $rankedTasks, ?array $weatherContext): array
    {
        $top = $rankedTasks[0];
        $topTitle = $top['title'] ?? 'The top task';
        $topScore = $top['priority_score'] ?? 'N/A';
        $breakdown = $top['breakdown'] ?? [];

        $factors = collect(['importance', 'urgency', 'time_availability', 'current_workload'])
            ->map(fn (string $key) => [
                'key' => $key,
                'weighted' => $breakdown[$key]['weighted'] ?? 0,
            ])
            ->sortByDesc('weighted')
            ->values();

        $leading = $factors->first();
        $leadingLabel = match ($leading['key'] ?? '') {
            'importance' => 'Importance',
            'urgency' => 'Urgency',
            'time_availability' => 'Time Availability',
            'current_workload' => 'Current Workload',
            default => 'Combined factors',
        };

        $summary = count($rankedTasks) === 1
            ? "One task was analyzed with a priority score of {$topScore}."
            : "{$topTitle} ranks first with a score of {$topScore}. The deterministic formula favors tasks with stronger weighted contributions across importance, urgency, available time, and workload.";

        $topExplanation = "{$topTitle} leads the ranking primarily because {$leadingLabel} contributed the largest weighted share ({$leading['weighted']} points). "
            . 'Urgency reflects deadline proximity; importance reflects task impact; time availability and workload reflect scheduling context.';

        $tips = [
            'Start with the highest-ranked pending task to reduce deadline risk.',
            'Review lower-ranked tasks only after the top priorities are underway.',
        ];

        $weatherAdvice = null;
        if ($weatherContext) {
            $condition = strtolower((string) ($weatherContext['weather_condition'] ?? ''));
            if (str_contains($condition, 'rain') || str_contains($condition, 'storm')) {
                $weatherAdvice = 'Rain is expected in your saved city. Indoor tasks may be easier to complete today.';
            } elseif (str_contains($condition, 'clear') || str_contains($condition, 'sunny')) {
                $weatherAdvice = 'Clear weather in your saved city. Outdoor errands may be a good fit during breaks.';
            }
        }

        return [
            'summary' => $summary,
            'top_task_explanation' => $topExplanation,
            'productivity_tips' => $tips,
            'weather_advice' => $weatherAdvice,
            'source' => 'heuristic',
        ];
    }
}

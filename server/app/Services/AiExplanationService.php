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
    public function explainRanking(array $rankedTasks, ?array $weatherContext = null, ?string $timezone = null): array
    {
        if (count($rankedTasks) === 0) {
            return [
                'summary' => 'No tasks were selected for analysis.',
                'top_task_explanation' => null,
                'task_explanations' => [],
                'productivity_tips' => [],
                'weather_advice' => null,
                'source' => 'default',
            ];
        }

        $payload = $this->buildPayload($rankedTasks, $weatherContext, $timezone);
        $aiResult = $this->explainWithAi($payload);

        if ($aiResult !== null) {
            return $aiResult;
        }

        return $this->explainWithHeuristic($rankedTasks, $weatherContext);
    }

    private function buildPayload(array $rankedTasks, ?array $weatherContext, ?string $timezone): array
    {
        $tasks = collect($rankedTasks)->map(function (array $task) use ($timezone, $rankedTasks) {
            $breakdown = $task['breakdown'] ?? [];

            return [
                'rank' => $task['rank'] ?? null,
                'id' => $task['id'] ?? null,
                'title' => $task['title'] ?? 'Untitled',
                'description' => $task['description'] ?? null,
                'category' => $task['category'] ?? null,
                'location' => $task['location'] ?? null,
                'estimated_time_minutes' => $task['estimated_time_minutes'] ?? null,
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
                'due_time' => $task['due_time'] ?? null,
                'time_remaining' => $task['time_remaining'] ?? DeadlineUrgencyService::countdownLabel(
                    $task['due_date'] ?? null,
                    $task['due_time'] ?? null,
                    $timezone
                ),
                'analyzed_task_count' => $task['analyzed_task_count'] ?? count($rankedTasks),
                'pending_task_count' => $task['pending_task_count'] ?? null,
                'scheduled_weather' => $task['scheduled_weather'] ?? null,
                'ranked_before' => $task['rank'] > 1
                    ? ($rankedTasks[($task['rank'] ?? 1) - 2]['title'] ?? null)
                    : null,
                'ranked_after' => ($task['rank'] ?? 1) < count($rankedTasks)
                    ? ($rankedTasks[$task['rank'] ?? 1]['title'] ?? null)
                    : null,
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
  "task_explanations": [{"id": 123, "explanation": "<one or two concise, natural sentences explaining this task's actual rank and deadline>"}],
  "productivity_tips": ["<tip1>", "<tip2>"],
  "weather_advice": "<optional weather-based scheduling advice or null>"
}

Rules:
- Use ONLY the provided task details, final ranks, time remaining, factor contributions, and scheduled weather.
- Explain each task's actual position in the returned ranking. Compare it only with the task titles provided in ranked_before/ranked_after.
- Never say the top-ranked task has the closest deadline unless the provided deadlines prove that.
- Do not invent task details, comparisons, deadlines, forecasts, or weather impact. Mention weather only when scheduled_weather is provided and relevant to an outdoor activity.
- Keep each task explanation to one to three short, plain-language sentences. Explain that its rank follows the final deterministic results; do not calculate or change the score.
- Weather is context only and must not imply that it changes priority.
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

        $allowedTaskIds = collect($payload['tasks'] ?? [])->pluck('id')->filter()->map(fn ($id) => (int) $id)->all();

        return [
            'summary' => $summary,
            'top_task_explanation' => trim((string) ($parsed['top_task_explanation'] ?? '')) ?: null,
            'task_explanations' => collect((array) ($parsed['task_explanations'] ?? []))
                ->filter(fn ($item) => is_array($item)
                    && isset($item['id'], $item['explanation'])
                    && in_array((int) $item['id'], $allowedTaskIds, true))
                ->mapWithKeys(fn ($item) => [(int) $item['id'] => trim((string) $item['explanation'])])
                ->filter(fn ($explanation) => $explanation !== '')
                ->all(),
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

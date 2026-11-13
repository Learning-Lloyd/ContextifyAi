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
        $aiResult = $this->explainWithAi($payload, $rankedTasks);

        if ($aiResult !== null) {
            return $aiResult;
        }

        return $this->explainWithHeuristic($rankedTasks, $weatherContext);
    }

    private function buildPayload(array $rankedTasks, ?array $weatherContext, ?string $timezone): array
    {
        $privacy = new AiPrivacyFilter();
        $tasks = collect($rankedTasks)->map(function (array $task) use ($timezone, $rankedTasks, $privacy) {
            $breakdown = $task['breakdown'] ?? [];
            $factorLabels = [
                'importance' => 'importance',
                'urgency' => 'deadline timing',
                'time_availability' => 'available time',
                'current_workload' => 'current workload',
            ];
            $leadingFactors = collect($factorLabels)
                ->map(fn ($label, $key) => ['label' => $label, 'value' => (float) ($breakdown[$key]['weighted'] ?? 0)])
                ->sortByDesc('value')
                ->take(2)
                ->pluck('label')
                ->values()
                ->all();

            return [
                'rank' => $task['rank'] ?? null,
                'task_ref' => 'task_'.$task['rank'],
                'title' => $privacy->redact($task['title'] ?? 'Untitled'),
                'description' => $privacy->redact($task['description'] ?? null),
                'category' => $privacy->redact($task['category'] ?? null),
                'main_context' => $leadingFactors,
                'time_remaining' => $task['time_remaining'] ?? DeadlineUrgencyService::countdownLabel(
                    $task['due_date'] ?? null,
                    $task['due_time'] ?? null,
                    $timezone
                ),
                'analyzed_task_count' => $task['analyzed_task_count'] ?? count($rankedTasks),
                'pending_task_count' => $task['pending_task_count'] ?? null,
                'scheduled_weather' => isset($task['scheduled_weather']) ? array_intersect_key((array) $task['scheduled_weather'], array_flip(['weather_condition', 'temperature', 'rain_probability'])) : null,
                'ranked_before' => $task['rank'] > 1
                    ? $privacy->redact($rankedTasks[($task['rank'] ?? 1) - 2]['title'] ?? null)
                    : null,
                'ranked_after' => ($task['rank'] ?? 1) < count($rankedTasks)
                    ? $privacy->redact($rankedTasks[$task['rank'] ?? 1]['title'] ?? null)
                    : null,
            ];
        })->values()->all();

        return [
            'tasks' => $tasks,
            'weather' => $weatherContext === null ? null : array_intersect_key(
                $weatherContext,
                array_flip(['weather_condition', 'temperature', 'rain_probability'])
            ),
        ];
    }

    private function explainWithAi(array $payload, array $rankedTasks): ?array
    {
        $system = <<<'PROMPT'
You are Contextify's thoughtful, supportive study-planning assistant. Explain the already-computed task order like a helpful person speaking to a student, not like a scoring report. The order is final; never recalculate or change it.

Return ONLY valid JSON:
{
  "summary": "<2-3 sentences on overall ranking>",
  "top_task_explanation": "<a warm, practical explanation of why the first task deserves attention>",
  "task_explanations": [{"task_ref": "task_1", "explanation": "<one or two concise, natural sentences explaining this task's actual rank and deadline>"}],
  "productivity_tips": ["<tip1>", "<tip2>"],
  "weather_advice": "<optional weather-based scheduling advice or null>"
}

Rules:
- Use ONLY the provided task details, final ranks, main_context, time remaining, and scheduled weather.
- Explain each task's actual position in the returned ranking. Compare it only with the task titles provided in ranked_before/ranked_after.
- Write in natural, warm, student-friendly language. Explain what makes the task worth doing now and give a useful next step when appropriate.
- Never mention points, scores, ratings, weights, percentages, formulas, or factor numbers. Do not list main_context as labels; translate it into a simple explanation connected to the task details.
- Avoid robotic phrases such as "based on the weighted factors" or "this task ranks above". Do not repeat the same sentence pattern for every task.
- Never say the top-ranked task has the closest deadline unless the provided deadlines prove that.
- Do not invent task details, comparisons, deadlines, forecasts, or weather impact. Mention weather only when scheduled_weather is provided and relevant to an outdoor activity.
- Keep each task explanation to one or two short, plain-language sentences. Do not explain the scoring mechanics or say that you calculated the order.
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

        $taskIdsByRef = collect($rankedTasks)->keyBy(fn ($task) => 'task_'.($task['rank'] ?? ''))->map(fn ($task) => (int) ($task['id'] ?? 0));
        $allowedRefs = collect($payload['tasks'] ?? [])->pluck('task_ref')->all();

        return [
            'summary' => $summary,
            'top_task_explanation' => trim((string) ($parsed['top_task_explanation'] ?? '')) ?: null,
            'task_explanations' => collect((array) ($parsed['task_explanations'] ?? []))
                ->filter(fn ($item) => is_array($item)
                && isset($item['task_ref'], $item['explanation'])
                    && in_array((string) $item['task_ref'], $allowedRefs, true))
                ->mapWithKeys(fn ($item) => [($taskIdsByRef[(string) $item['task_ref']] ?? 0) => trim((string) $item['explanation'])])
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

        $countdown = DeadlineUrgencyService::countdownLabel($top['due_date'] ?? null, $top['due_time'] ?? null);
        $summary = $countdown
            ? "{$topTitle} is first on your list, and its deadline is {$countdown}. Starting with one small step now can make it easier to finish on time."
            : "{$topTitle} is first on your list. Start with one manageable step, then check how much time and energy you have for the next task.";

        $topExplanation = $countdown
            ? "This task comes first in your current plan, with its deadline {$countdown}. Begin with the next concrete step and give yourself room to finish."
            : "This task comes first in your current plan. Choose a small first step to build momentum, then move on when you have made progress.";

        $tips = [
            'Break the first task into a small step you can start now.',
            'After making progress, check your remaining time before choosing what to do next.',
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

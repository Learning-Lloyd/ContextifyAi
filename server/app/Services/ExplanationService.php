<?php

namespace App\Services;

class ExplanationService
{
    /** Build a natural-language rationale from the actual ranking and task context. */
    public function forTaskCard(
        array $task,
        int $rank = 1,
        int $total = 1,
        ?string $timezone = null,
        array $rankedTasks = []
    ): string
    {
        $breakdown = $task['breakdown'] ?? [];
        $labels = [
            'importance' => 'Importance',
            'urgency' => 'Deadline urgency',
            'time_availability' => 'Available time',
            'current_workload' => 'Current workload',
        ];
        $contributions = collect($labels)
            ->filter(fn ($label, $key) => isset($breakdown[$key]['weighted']))
            ->map(fn ($label, $key) => ['label' => $label, 'value' => (float) $breakdown[$key]['weighted']])
            ->sortByDesc('value')
            ->values();

        $ordinal = match ($rank) {
            1 => 'first',
            2 => 'second',
            3 => 'third',
            default => "#{$rank}",
        };

        if ($rank === 1) {
            $otherCount = $total - 1;
            $rankingSentence = $total > 1
                ? "Complete this task first; it ranks above {$otherCount} other task" . ($otherCount === 1 ? '' : 's') . ' in this analysis.'
                : 'This is the top priority in the current analysis.';
        } elseif ($rank === $total) {
            $rankingSentence = "This task ranks last of {$total} analyzed tasks, so schedule it after the higher-ranked work.";
        } else {
            $previousTitle = $rankedTasks[$rank - 2]['title'] ?? null;
            $rankingSentence = $previousTitle
                ? "This is your {$ordinal} priority, after {$previousTitle} in the current ranking."
                : "This task ranks {$ordinal} of {$total} analyzed tasks.";
        }

        $parts = [$rankingSentence];
        $countdown = DeadlineUrgencyService::countdownLabel(
            $task['due_date'] ?? null,
            $task['due_time'] ?? null,
            $timezone
        );
        if ($countdown) {
            $parts[] = "{$countdown}.";
        } else {
            $parts[] = 'No deadline is set, so this ranking is based on the current task factors.';
        }

        $weatherNote = $this->taskWeatherAdvisory($task);
        if ($weatherNote) {
            $parts[] = $weatherNote;
        } elseif ($contributions->isNotEmpty()) {
            $leading = $contributions->first();
            $next = $contributions->get(1);
            $parts[] = $next && abs($leading['value'] - $next['value']) < 0.001
                ? "{$leading['label']} and {$next['label']} influenced its result most."
                : ($next
                    ? "{$leading['label']} and {$next['label']} had the strongest influence on its result."
                    : "{$leading['label']} had the strongest influence on its result.");
        }

        return implode(' ', array_slice($parts, 0, 3));
    }

    private function taskWeatherAdvisory(array $task): ?string
    {
        $forecast = $task['scheduled_weather'] ?? null;
        if (! is_array($forecast) || empty($forecast['weather_condition'])) {
            return null;
        }

        $activity = strtolower(implode(' ', array_filter([
            $task['title'] ?? null,
            $task['description'] ?? null,
            $task['category'] ?? null,
        ])));
        if (! preg_match('/outdoor|outside|walk|hike|run|picnic|garden|yard|travel|commute|field|camp|errand|sports|bike|cycling|beach/i', $activity)) {
            return null;
        }

        $condition = strtolower((string) $forecast['weather_condition']);
        if (str_contains($condition, 'rain') || str_contains($condition, 'storm') || str_contains($condition, 'thunder')) {
            return 'Rain or storms are forecast near its deadline; consider planning an alternative.';
        }

        return null;
    }

    /**
     * Generate contextual explanation. Weather is advisory only and never changes score.
     */
    public function forTask(array $task): string
    {
        $parts = [];

        $parts[] = 'This task is evaluated using importance, urgency, available time, and current workload.';

        if (! empty($task['due_date'])) {
            $group = DeadlineUrgencyService::deadlineGroup($task['due_date']);
            $countdown = DeadlineUrgencyService::countdownLabel($task['due_date'], $task['due_time'] ?? null);
            if ($group === 'overdue') {
                $parts[] = 'It is overdue and should be addressed as soon as possible.';
            } elseif ($group === 'today') {
                $parts[] = 'It is due today' . ($countdown ? " ({$countdown})" : '') . '.';
            } elseif ($countdown) {
                $parts[] = "Deadline: {$countdown}.";
            }
        }

        $weatherNote = $this->weatherAdvisory($task);
        if ($weatherNote) {
            $parts[] = $weatherNote;
        }

        return implode(' ', $parts);
    }

    public function forRankedTask(array $task, int $rank): string
    {
        $base = "Ranked #{$rank} with a score of {$task['priority_score']}.";
        $weatherNote = $this->weatherAdvisory($task);

        return $weatherNote ? "{$base} {$weatherNote}" : $base;
    }

    public function forConflictGroup(string $date, int $count, array $rankedTasks): string
    {
        return "Multiple deadlines occur on {$date}. {$count} tasks share this due date. " .
            'The ranking was generated by evaluating Importance, Urgency, Time Availability, and Current Workload. ' .
            'Focus on higher-ranked tasks first.';
    }

    /**
     * Detailed XAI explanation for a ranked task in Decision Lab.
     */
    public function forRankedTaskDetailed(array $task, int $rank, array $allRanked): array
    {
        $reasonBullets = $this->buildRankReasonBullets($task);
        $overall = $this->buildOverallExplanation($task, $rank, $allRanked);
        $factorBreakdown = $this->formatFactorBreakdown($task['breakdown'] ?? []);
        $weatherContext = $this->weatherContextExplanation($task);
        $recommendation = $this->taskRecommendation($task, $rank, count($allRanked));
        $whyNot = $this->buildWhyNotExplanation($task, $rank, $allRanked);

        return [
            'reason_bullets' => $reasonBullets,
            'overall_explanation' => $overall,
            'factor_breakdown' => $factorBreakdown,
            'weather_context' => $weatherContext,
            'recommendation' => $recommendation,
            'why_not' => $whyNot,
            'countdown' => DeadlineUrgencyService::countdownLabel($task['due_date'] ?? null, $task['due_time'] ?? null),
            'priority_level' => $this->priorityLevel($task['priority_score'] ?? 0),
        ];
    }

    /**
     * Explain why this task ranked lower than a higher-ranked reference task.
     * Weather is never used in scoring comparisons.
     */
    public function buildWhyNotExplanation(array $task, int $rank, array $allRanked): ?array
    {
        if ($rank <= 1 || empty($allRanked)) {
            return null;
        }

        $reference = $allRanked[$rank - 2] ?? $allRanked[0];
        $top = $allRanked[0];
        $scoreGap = round(($reference['priority_score'] ?? 0) - ($task['priority_score'] ?? 0), 2);
        $gapToTop = round(($top['priority_score'] ?? 0) - ($task['priority_score'] ?? 0), 2);

        $taskBreakdown = $task['breakdown'] ?? [];
        $refBreakdown = $reference['breakdown'] ?? [];
        $disadvantages = $this->factorDisadvantages($taskBreakdown, $refBreakdown);

        $refTitle = $reference['title'] ?? 'the higher-ranked task';
        $topTitle = $top['title'] ?? 'the top task';
        $bullets = [];
        foreach ($disadvantages as $item) {
            $bullets[] = "{$item['label']} contributed {$item['difference']} fewer weighted points than {$refTitle}.";
        }

        if ($rank > 2 && $topTitle !== $refTitle) {
            $topBreakdown = $top['breakdown'] ?? [];
            $topDisadvantages = $this->factorDisadvantages($taskBreakdown, $topBreakdown);
            if (! empty($topDisadvantages)) {
                $primary = $topDisadvantages[0];
                $bullets[] = "Compared to #1 ({$topTitle}), {$primary['label']} is the main limiting factor ({$gapToTop} total score gap).";
            }
        }

        if (empty($bullets)) {
            $bullets[] = "The score gap of {$scoreGap} points is driven by the combined weighted factors, not a single dominant factor.";
        }

        $taskTitle = $task['title'] ?? 'This task';
        $summary = "Why not rank #" . ($rank - 1) . "? {$refTitle} scores {$reference['priority_score']} vs {$task['priority_score']} for {$taskTitle}. " .
            'The deterministic formula (Importance 40%, Urgency 30%, Time Availability 20%, Workload 10%) favors the higher-ranked task.';

        return [
            'reference_task' => [
                'title' => $refTitle,
                'rank' => $reference['rank'] ?? ($rank - 1),
                'score' => $reference['priority_score'] ?? null,
            ],
            'score_gap' => $scoreGap,
            'gap_to_top' => $gapToTop,
            'why_not_bullets' => $bullets,
            'why_not_summary' => $summary,
            'factor_disadvantages' => $disadvantages,
        ];
    }

    public function confidenceExplanation(string $level, float $scoreGap): string
    {
        return match ($level) {
            'high' => "The top recommendation is clear — a {$scoreGap}-point score gap indicates a strong weighted advantage.",
            'medium' => "Moderate confidence — the {$scoreGap}-point gap suggests a meaningful but not overwhelming difference.",
            default => "Low confidence — scores are very close ({$scoreGap}-point gap). Review factor breakdowns carefully before deciding.",
        };
    }

    public function buildDecisionSummary(array $rankedTasks, array $conflicts): array
    {
        $highest = $rankedTasks[0] ?? null;
        $lowest = $rankedTasks[count($rankedTasks) - 1] ?? null;
        $weatherConditions = collect($rankedTasks)
            ->pluck('weather_condition')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $dominantWeather = count($weatherConditions) === 1 ? $weatherConditions[0] : (count($weatherConditions) > 1 ? 'Mixed' : 'Unknown');

        return [
            'tasks_analyzed' => count($rankedTasks),
            'highest_priority' => $highest ? ['title' => $highest['title'], 'score' => $highest['priority_score']] : null,
            'lowest_priority' => $lowest ? ['title' => $lowest['title'], 'score' => $lowest['priority_score']] : null,
            'weather' => $dominantWeather,
            'potential_deadline_conflicts' => count($conflicts),
            'recommendation_summary' => $this->buildSummaryRecommendation($rankedTasks),
        ];
    }

    public function buildActionRecommendation(array $rankedTasks): array
    {
        if (count($rankedTasks) === 0) {
            return ['sequence' => [], 'reason' => 'No tasks selected.'];
        }

        $lastIndex = count($rankedTasks) - 1;

        $sequence = collect($rankedTasks)->map(function (array $task, int $index) use ($lastIndex) {
            $title = $task['title'] ?? 'Untitled Task';
            $prefix = match ($index) {
                0 => 'Begin with',
                $lastIndex => 'Finally',
                default => 'Next, complete',
            };

            return "{$prefix} {$title}.";
        })->all();

        $reason = 'The recommended sequence minimizes deadline risk while balancing workload and available study time.';

        return [
            'sequence' => $sequence,
            'reason' => $reason,
        ];
    }

    public function formatFactorBreakdown(array $breakdown): array
    {
        if (empty($breakdown)) {
            return [];
        }

        $labels = [
            'importance' => ['label' => 'Importance', 'percent' => '40%'],
            'urgency' => ['label' => 'Urgency', 'percent' => '30%'],
            'time_availability' => ['label' => 'Time Availability', 'percent' => '20%'],
            'current_workload' => ['label' => 'Current Workload', 'percent' => '10%'],
        ];

        $formatted = [];
        foreach ($labels as $key => $meta) {
            if (! isset($breakdown[$key])) {
                continue;
            }
            $item = $breakdown[$key];
            $formatted[] = [
                'key' => $key,
                'label' => $meta['label'],
                'value' => $item['value'],
                'weight_label' => $meta['percent'],
                'weighted' => $item['weighted'],
                'formula' => "{$item['value']} × {$meta['percent']} = {$item['weighted']}",
            ];
        }

        return [
            'factors' => $formatted,
            'final_score' => $breakdown['final_score'] ?? null,
        ];
    }

    public function weatherContextExplanation(array $task): ?array
    {
        if (empty($task['location']) && empty($task['weather_condition'])) {
            return null;
        }

        $condition = strtolower($task['weather_condition'] ?? 'cloudy');
        $explanation = $this->weatherScenarioText($condition);

        return [
            'location' => $task['location'] ?? 'Unknown',
            'temperature' => $task['temperature'],
            'weather_condition' => $task['weather_condition'] ?? 'Unknown',
            'rain_probability' => $task['rain_probability'] ?? null,
            'icon' => $this->weatherIconKey($condition),
            'explanation' => $explanation,
            'disclaimer' => 'Weather does not affect the priority score.',
        ];
    }

    private function buildRankReasonBullets(array $task): array
    {
        $bullets = [];
        $importance = (int) ($task['importance'] ?? 5);
        $workload = (int) ($task['current_workload'] ?? 5);
        $timeAvailability = (int) ($task['time_availability'] ?? 5);

        if ($importance >= 8) {
            $bullets[] = "Importance is very high ({$importance}/10).";
        } elseif ($importance >= 5) {
            $bullets[] = "Importance is moderate ({$importance}/10).";
        } else {
            $bullets[] = "Importance is relatively low ({$importance}/10).";
        }

        if (! empty($task['due_date'])) {
            $group = DeadlineUrgencyService::deadlineGroup($task['due_date']);
            if ($group === 'overdue') {
                $bullets[] = 'This task is overdue, significantly increasing urgency.';
            } elseif ($group === 'today') {
                $bullets[] = 'Due today, increasing urgency.';
            } elseif ($group === 'tomorrow') {
                $bullets[] = 'Due tomorrow, increasing urgency.';
            } else {
                $bullets[] = 'Deadline is approaching within the upcoming period.';
            }
        }

        if ($workload <= 4) {
            $bullets[] = 'Current workload is manageable.';
        } elseif ($workload >= 8) {
            $bullets[] = 'Current workload is high, which affects scheduling.';
        } else {
            $bullets[] = 'Current workload is moderate.';
        }

        if ($timeAvailability >= 7) {
            $bullets[] = 'Enough available time remains.';
        } elseif ($timeAvailability <= 4) {
            $bullets[] = 'Limited time availability may require earlier action.';
        }

        return $bullets;
    }

    private function buildOverallExplanation(array $task, int $rank, array $allRanked): string
    {
        if ($rank === 1) {
            return "This task ranks first because it combines the highest importance with the nearest deadline. " .
                'Completing it first minimizes the risk of missing a critical requirement while leaving sufficient time for lower-priority tasks.';
        }

        $top = $allRanked[0] ?? null;
        if ($top) {
            return "This task ranks #{$rank} because its weighted score ({$task['priority_score']}) is lower than {$top['title']} ({$top['priority_score']}). " .
                'It should be addressed after higher-priority items to optimize deadline management.';
        }

        return "This task ranks #{$rank} based on its weighted priority score of {$task['priority_score']}.";
    }

    private function taskRecommendation(array $task, int $rank, int $total): string
    {
        if ($rank === 1) {
            return 'Complete this task first to reduce the highest deadline and importance risk.';
        }
        if ($rank === $total) {
            return 'Schedule this task after higher-priority items are completed.';
        }

        return 'Address this task after higher-ranked items in the recommended sequence.';
    }

    private function buildSummaryRecommendation(array $rankedTasks): string
    {
        if (count($rankedTasks) === 0) {
            return 'No tasks to recommend.';
        }

        $topTitles = collect($rankedTasks)->take(2)->pluck('title')->implode(' and ');

        return "Finish {$topTitles} before lower-priority tasks to minimize deadline risk.";
    }

    private function priorityLevel(float $score): string
    {
        return match (true) {
            $score >= 8 => 'high',
            $score >= 5 => 'medium',
            default => 'low',
        };
    }

    private function weatherScenarioText(string $condition): string
    {
        if (str_contains($condition, 'rain') || str_contains($condition, 'drizzle')) {
            return 'Rain is forecast for your selected location on the task date. Although weather does not change the priority score, completing outdoor activities earlier may reduce delays caused by rainfall.';
        }
        if (str_contains($condition, 'thunder') || str_contains($condition, 'storm')) {
            return 'Severe weather is forecast. Although weather does not affect your priority score, finishing this task earlier is recommended to avoid possible disruptions.';
        }
        if (str_contains($condition, 'clear') || str_contains($condition, 'sunny')) {
            return 'Clear weather is expected. No weather-related disruptions are anticipated.';
        }
        if (str_contains($condition, 'wind') || str_contains($condition, 'fog')) {
            return 'Strong winds or reduced visibility are expected. If this task involves travel or outdoor work, consider preparing earlier.';
        }
        if (str_contains($condition, 'cloud') || str_contains($condition, 'partly')) {
            return 'Cloudy conditions are expected. Minimal weather impact is anticipated.';
        }

        return 'Weather conditions are shown for context only and do not affect the deterministic priority score.';
    }

    private function weatherIconKey(string $condition): string
    {
        if (str_contains($condition, 'rain') || str_contains($condition, 'drizzle')) {
            return 'rain';
        }
        if (str_contains($condition, 'thunder') || str_contains($condition, 'storm')) {
            return 'storm';
        }
        if (str_contains($condition, 'clear') || str_contains($condition, 'sunny')) {
            return 'sunny';
        }
        if (str_contains($condition, 'wind') || str_contains($condition, 'fog')) {
            return 'windy';
        }

        return 'cloudy';
    }

    private function weatherAdvisory(array $task): ?string
    {
        $context = $this->weatherContextExplanation($task);

        return $context ? $context['explanation'] : null;
    }

    private function factorDisadvantages(array $taskBreakdown, array $referenceBreakdown): array
    {
        $labels = [
            'importance' => 'Importance',
            'urgency' => 'Urgency',
            'time_availability' => 'Time Availability',
            'current_workload' => 'Current Workload',
        ];

        $disadvantages = [];
        foreach ($labels as $key => $label) {
            if (! isset($taskBreakdown[$key], $referenceBreakdown[$key])) {
                continue;
            }
            $difference = round($referenceBreakdown[$key]['weighted'] - $taskBreakdown[$key]['weighted'], 2);
            if ($difference > 0) {
                $disadvantages[] = [
                    'key' => $key,
                    'label' => $label,
                    'difference' => $difference,
                ];
            }
        }

        usort($disadvantages, fn (array $a, array $b) => $b['difference'] <=> $a['difference']);

        return array_slice($disadvantages, 0, 3);
    }
}

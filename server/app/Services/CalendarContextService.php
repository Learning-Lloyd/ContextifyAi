<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class CalendarContextService
{
    private const DEFAULT_TASK_MINUTES = 60;

    private const PRODUCTIVE_MINUTES_PER_DAY = 480;

    private const TIME_AVAILABILITY_DAYS = 7;

    private const WORKLOAD_DAYS = 14;

    /**
     * Derive calendar-based scoring factors for a user.
     *
     * Time Availability: how much free time exists to work on tasks (next 7 days).
     * Current Workload: how heavy upcoming commitments are (next 14 days).
     */
    public function analyze(User $user, ?string $dueDate = null, ?int $excludeTaskId = null): array
    {
        $events = $this->loadCalendarEvents($user, $excludeTaskId);

        if ($events->isEmpty()) {
            return [
                'time_availability' => 5,
                'current_workload' => 5,
                'reason_time_availability' => 'No calendar commitments found — using a neutral time availability baseline.',
                'reason_current_workload' => 'No upcoming calendar commitments found — using a neutral workload baseline.',
                'source' => 'default',
                'commitments_count' => 0,
            ];
        }

        $timeAvailability = $this->calculateTimeAvailability($events);
        $workload = $this->calculateCurrentWorkload($events, $dueDate);

        return [
            'time_availability' => $timeAvailability['value'],
            'current_workload' => $workload['value'],
            'reason_time_availability' => $timeAvailability['reason'],
            'reason_current_workload' => $workload['reason'],
            'source' => 'calendar',
            'commitments_count' => $events->count(),
        ];
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    private function loadCalendarEvents(User $user, ?int $excludeTaskId = null): Collection
    {
        $query = $user->tasks()
            ->active()
            ->where('status', 'pending')
            ->whereNotNull('due_date');

        if ($excludeTaskId !== null) {
            $query->where('id', '!=', $excludeTaskId);
        }

        return $query->get()->map(fn (Task $task) => [
            'id' => $task->id,
            'title' => $task->title,
            'due_date' => $task->due_date?->format('Y-m-d'),
            'due_time' => $task->due_time,
            'estimated_time_minutes' => $task->estimated_time_minutes ?? self::DEFAULT_TASK_MINUTES,
            'importance' => $task->importance,
            'urgency' => $task->urgency,
        ]);
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $events
     * @return array{value: int, reason: string}
     */
    private function calculateTimeAvailability(Collection $events): array
    {
        $today = now()->startOfDay();
        $windowEnd = $today->copy()->addDays(self::TIME_AVAILABILITY_DAYS - 1)->endOfDay();

        $busyMinutesByDay = [];
        $scheduledDays = 0;

        for ($day = 0; $day < self::TIME_AVAILABILITY_DAYS; $day++) {
            $dateKey = $today->copy()->addDays($day)->format('Y-m-d');
            $busyMinutesByDay[$dateKey] = 0;
        }

        foreach ($events as $event) {
            $eventDate = Carbon::parse($event['due_date'])->startOfDay();
            if ($eventDate->lt($today) || $eventDate->gt($windowEnd)) {
                continue;
            }

            $dateKey = $eventDate->format('Y-m-d');
            $busyMinutesByDay[$dateKey] = min(
                self::PRODUCTIVE_MINUTES_PER_DAY,
                ($busyMinutesByDay[$dateKey] ?? 0) + (int) $event['estimated_time_minutes']
            );
        }

        $freeRatios = [];
        foreach ($busyMinutesByDay as $dateKey => $busyMinutes) {
            if ($busyMinutes > 0) {
                $scheduledDays++;
            }
            $freeMinutes = max(0, self::PRODUCTIVE_MINUTES_PER_DAY - $busyMinutes);
            $freeRatios[] = $freeMinutes / self::PRODUCTIVE_MINUTES_PER_DAY;
        }

        $averageFreeRatio = count($freeRatios) > 0
            ? array_sum($freeRatios) / count($freeRatios)
            : 0.5;

        $value = $this->mapRatioToScore($averageFreeRatio);

        $reason = match (true) {
            $scheduledDays === 0 => 'Your calendar has no scheduled commitments in the next 7 days, indicating ample free time.',
            $averageFreeRatio >= 0.7 => "Your calendar shows {$scheduledDays} busy day(s) in the next week with plenty of remaining free time.",
            $averageFreeRatio >= 0.4 => "Your calendar shows {$scheduledDays} busy day(s) in the next week with moderate free time.",
            default => "Your calendar shows {$scheduledDays} heavily scheduled day(s) in the next week with limited free time.",
        };

        return ['value' => $value, 'reason' => $reason];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $events
     * @return array{value: int, reason: string}
     */
    private function calculateCurrentWorkload(Collection $events, ?string $dueDate = null): array
    {
        $today = now()->startOfDay();
        $windowEnd = $today->copy()->addDays(self::WORKLOAD_DAYS - 1)->endOfDay();

        $pressureScore = 0.0;
        $upcomingCount = 0;
        $highStakesCount = 0;

        foreach ($events as $event) {
            $eventDate = Carbon::parse($event['due_date'])->startOfDay();
            if ($eventDate->lt($today) || $eventDate->gt($windowEnd)) {
                continue;
            }

            $upcomingCount++;
            $daysUntil = max(0, $today->diffInDays($eventDate, false));
            $proximityWeight = match (true) {
                $daysUntil === 0 => 3.0,
                $daysUntil <= 2 => 2.5,
                $daysUntil <= 7 => 2.0,
                default => 1.0,
            };

            $impactWeight = (((int) $event['importance']) + ((int) $event['urgency'])) / 20;
            $durationWeight = min(2.0, ((int) $event['estimated_time_minutes']) / self::DEFAULT_TASK_MINUTES);

            $pressureScore += $proximityWeight * (0.6 + $impactWeight) * $durationWeight;

            if ((int) $event['importance'] >= 7 || (int) $event['urgency'] >= 7) {
                $highStakesCount++;
            }
        }

        if ($dueDate) {
            $newTaskDate = Carbon::parse($dueDate)->startOfDay();
            if ($newTaskDate->betweenIncluded($today, $windowEnd)) {
                $sameDayCount = $events->filter(
                    fn (array $event) => $event['due_date'] === $newTaskDate->format('Y-m-d')
                )->count();
                if ($sameDayCount > 0) {
                    $pressureScore += $sameDayCount * 1.5;
                }
            }
        }

        $value = match (true) {
            $upcomingCount === 0 => 3,
            $pressureScore >= 18 => 10,
            $pressureScore >= 14 => 9,
            $pressureScore >= 10 => 8,
            $pressureScore >= 7 => 7,
            $pressureScore >= 5 => 6,
            $pressureScore >= 3 => 5,
            $pressureScore >= 1.5 => 4,
            default => 3,
        };

        $reason = match (true) {
            $upcomingCount === 0 => 'No upcoming calendar commitments were found in the next 14 days.',
            $highStakesCount >= 3 => "You have {$upcomingCount} upcoming commitment(s), including {$highStakesCount} high-stakes items — workload is heavy.",
            $upcomingCount >= 5 => "You have {$upcomingCount} upcoming calendar commitment(s) over the next 14 days — workload is elevated.",
            default => "You have {$upcomingCount} upcoming calendar commitment(s) over the next 14 days.",
        };

        return ['value' => $value, 'reason' => $reason];
    }

    private function mapRatioToScore(float $ratio): int
    {
        return max(1, min(10, (int) round($ratio * 9 + 1)));
    }
}

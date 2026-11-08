<?php

namespace App\Services;

use App\Models\User;
use Carbon\Carbon;

class SchedulingService
{
    public function suggest(User $user, string $startDate): array
    {
        if (! $user->daily_available_minutes || ! $user->workday_start_time) {
            return [
                'setup_required' => true,
                'message' => 'Set your daily available minutes and preferred start time in Profile to receive a schedule.',
                'days' => [],
                'unplanned_tasks' => [],
            ];
        }

        $start = Carbon::parse($startDate)->startOfDay();
        $end = $start->copy()->addDays(6)->endOfDay();
        $tasks = $user->tasks()
            ->active()
            ->where('status', 'pending')
            ->whereBetween('due_date', [$start->toDateString(), $end->toDateString()])
            ->get()
            ->sort(function ($a, $b) {
                $scoreOrder = $b->priority_score <=> $a->priority_score;

                return $scoreOrder !== 0 ? $scoreOrder : ($a->due_date <=> $b->due_date);
            })
            ->values();

        $days = [];
        $dayStartMinutes = $this->timeToMinutes((string) $user->workday_start_time);
        $dailyCapacity = min((int) $user->daily_available_minutes, 1440 - $dayStartMinutes);
        for ($offset = 0; $offset < 7; $offset++) {
            $date = $start->copy()->addDays($offset);
            $days[$date->toDateString()] = [
                'date' => $date->toDateString(),
                'available_minutes' => $dailyCapacity,
                'scheduled_minutes' => 0,
                'items' => [],
            ];
        }

        $unplanned = [];
        foreach ($tasks as $task) {
            if (! $task->estimated_time_minutes) {
                $unplanned[] = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'reason' => 'Add an estimated duration before this task can be placed in the schedule.',
                ];
                continue;
            }

            $duration = (int) $task->estimated_time_minutes;
            $latestDate = min($task->due_date->format('Y-m-d'), $end->toDateString());
            $assigned = false;

            foreach ($days as $dateKey => &$day) {
                if ($dateKey > $latestDate || $duration > $day['available_minutes'] - $day['scheduled_minutes']) {
                    continue;
                }

                $startMinutes = $dayStartMinutes + $day['scheduled_minutes'];
                $day['items'][] = [
                    'task_id' => $task->id,
                    'title' => $task->title,
                    'due_date' => $task->due_date->format('Y-m-d'),
                    'duration_minutes' => $duration,
                    'start_time' => $this->minutesToTime($startMinutes),
                    'end_time' => $this->minutesToTime($startMinutes + $duration),
                ];
                $day['scheduled_minutes'] += $duration;
                $assigned = true;
                break;
            }
            unset($day);

            if (! $assigned) {
                $unplanned[] = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'reason' => 'This task does not fit within the available minutes before its deadline.',
                ];
            }
        }

        return [
            'setup_required' => false,
            'daily_available_minutes' => $dailyCapacity,
            'workday_start_time' => substr((string) $user->workday_start_time, 0, 5),
            'days' => array_values($days),
            'unplanned_tasks' => $unplanned,
            'note' => 'Suggestions use your stated daily capacity, task durations, deadlines, and existing deterministic scores. They do not change task data or scoring.',
        ];
    }

    private function timeToMinutes(string $time): int
    {
        [$hours, $minutes] = array_map('intval', explode(':', substr($time, 0, 5)));

        return ($hours * 60) + $minutes;
    }

    private function minutesToTime(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}

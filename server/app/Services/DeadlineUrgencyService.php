<?php

namespace App\Services;

use Carbon\Carbon;

class DeadlineUrgencyService
{
    /**
     * Map due date proximity to urgency (1-10).
     * Used only when urgency has not been manually overridden.
     */
    public static function fromDueDate(?string $dueDate, ?string $dueTime = null): int
    {
        if (! $dueDate) {
            return 5;
        }

        $deadline = Carbon::parse($dueDate);
        if ($dueTime) {
            $deadline = Carbon::parse("{$dueDate} {$dueTime}");
        }

        $daysUntil = now()->startOfDay()->diffInDays($deadline->copy()->startOfDay(), false);

        return match (true) {
            $daysUntil < 0 => 10,
            $daysUntil === 0 => 10,
            $daysUntil === 1 => 8,
            $daysUntil <= 3 => 6,
            $daysUntil <= 7 => 4,
            default => 3,
        };
    }

    public static function label(int $urgency): string
    {
        return match (true) {
            $urgency >= 9 => 'Very High',
            $urgency >= 7 => 'High',
            $urgency >= 5 => 'Medium',
            default => 'Low',
        };
    }

    public static function deadlineGroup(?string $dueDate, ?string $timezone = null): string
    {
        if (! $dueDate) {
            return 'upcoming';
        }

        $date = Carbon::parse($dueDate, $timezone ?: config('app.timezone'))->startOfDay();
        $today = ($timezone ? Carbon::now($timezone) : now())->startOfDay();

        if ($date->lt($today)) {
            return 'overdue';
        }

        if ($date->equalTo($today)) {
            return 'today';
        }

        if ($date->equalTo($today->copy()->addDay())) {
            return 'tomorrow';
        }

        return 'upcoming';
    }

    public static function countdownLabel(?string $dueDate, ?string $dueTime = null, ?string $timezone = null): ?string
    {
        if (! $dueDate) {
            return null;
        }

        $deadline = Carbon::parse($dueDate, $timezone ?: config('app.timezone'));
        if ($dueTime) {
            $deadline = Carbon::parse("{$dueDate} {$dueTime}", $timezone ?: config('app.timezone'));
        } else {
            $deadline->endOfDay();
        }

        $now = $timezone ? Carbon::now($timezone) : now();
        $seconds = $now->diffInSeconds($deadline, false);
        if ($seconds < 0) {
            $elapsed = abs($seconds);
            if ($elapsed >= 86400) {
                $days = (int) floor($elapsed / 86400);
                return "Overdue by {$days} day" . ($days === 1 ? '' : 's');
            }
            if ($elapsed >= 3600) {
                $hours = (int) floor($elapsed / 3600);
                return "Overdue by {$hours} hour" . ($hours === 1 ? '' : 's');
            }
            $minutes = max(1, (int) floor($elapsed / 60));
            return "Overdue by {$minutes} minute" . ($minutes === 1 ? '' : 's');
        }

        if ($seconds >= 86400) {
            $days = (int) floor($seconds / 86400);
            return $days === 1 ? 'Due tomorrow' : "Due in {$days} days";
        }

        if ($seconds >= 3600) {
            $hours = (int) ceil($seconds / 3600);
            return "Due in {$hours} hour" . ($hours === 1 ? '' : 's');
        }

        if ($seconds >= 60) {
            $minutes = (int) ceil($seconds / 60);
            return "Due in {$minutes} minute" . ($minutes === 1 ? '' : 's');
        }

        return 'Due now';
    }
}

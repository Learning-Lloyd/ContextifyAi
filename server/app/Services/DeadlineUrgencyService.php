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

    public static function deadlineGroup(?string $dueDate): string
    {
        if (! $dueDate) {
            return 'upcoming';
        }

        $date = Carbon::parse($dueDate)->startOfDay();
        $today = now()->startOfDay();

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

    public static function countdownLabel(?string $dueDate, ?string $dueTime = null): ?string
    {
        if (! $dueDate) {
            return null;
        }

        $deadline = Carbon::parse($dueDate);
        if ($dueTime) {
            $deadline = Carbon::parse("{$dueDate} {$dueTime}");
        }

        if ($deadline->isPast()) {
            return 'Overdue';
        }

        $diff = now()->diff($deadline);

        if ($diff->days > 0) {
            return "{$diff->days} day" . ($diff->days > 1 ? 's' : '') . ' left';
        }

        if ($diff->h > 0) {
            return "{$diff->h} hour" . ($diff->h > 1 ? 's' : '') . ' left';
        }

        return "{$diff->i} min left";
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Task;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;

class GenerateTaskReminders extends Command
{
    protected $signature = 'contextify:generate-task-reminders';

    protected $description = 'Create deduplicated in-app reminders for approaching and overdue tasks';

    public function handle(): int
    {
        $created = 0;
        $now = now();

        User::query()
            ->where('task_reminders_enabled', true)
            ->with(['tasks' => fn ($query) => $query
                ->active()
                ->where('status', 'pending')
                ->whereNotNull('due_date')])
            ->chunkById(100, function ($users) use ($now, &$created) {
                foreach ($users as $user) {
                    foreach ($user->tasks as $task) {
                        $dueAt = Carbon::parse(
                            $task->due_date->format('Y-m-d') . ' ' . ($task->due_time ?: '23:59:59'),
                            config('app.timezone')
                        );

                        if ($dueAt->isPast()) {
                            if (! $user->overdue_reminders_enabled) {
                                continue;
                            }

                            $created += $this->createReminder(
                                $user,
                                $task,
                                'overdue',
                                'Task overdue',
                                "{$task->title} is past its deadline. Review it, update the deadline, or mark it complete.",
                                'overdue:' . $task->id . ':' . $dueAt->timestamp
                            );

                            continue;
                        }

                        $reminderAt = $dueAt->copy()->subMinutes((int) $user->deadline_reminder_minutes);
                        if ($now->lt($reminderAt)) {
                            continue;
                        }

                        $created += $this->createReminder(
                            $user,
                            $task,
                            'deadline_approaching',
                            'Deadline approaching',
                            "{$task->title} is due " . $dueAt->diffForHumans() . '. Review your plan and available time.',
                            'deadline:' . $task->id . ':' . $dueAt->timestamp
                        );
                    }
                }
            });

        $this->info("Created {$created} new task reminder(s).");

        return self::SUCCESS;
    }

    private function createReminder(User $user, Task $task, string $type, string $title, string $message, string $dedupeKey): int
    {
        $notification = $user->inAppNotifications()->firstOrCreate(
            ['dedupe_key' => $dedupeKey],
            [
                'task_id' => $task->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'metadata' => ['due_date' => $task->due_date->format('Y-m-d'), 'due_time' => $task->due_time],
            ]
        );

        return $notification->wasRecentlyCreated ? 1 : 0;
    }
}

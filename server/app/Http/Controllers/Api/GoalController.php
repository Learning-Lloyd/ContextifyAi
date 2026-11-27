<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Goal;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $timezone = $this->clientTimezone($request);
        $goals = $request->user()->goals()->orderBy('ends_on')->get()->map(function (Goal $goal) use ($timezone) {
            $formatted = $this->format($goal, $timezone);
            $this->notifyMilestone($goal, $formatted);

            return $formatted;
        });

        return response()->json(['goals' => $goals]);
    }

    public function store(Request $request): JsonResponse
    {
        $goal = $request->user()->goals()->create($this->validated($request));
        return response()->json(['goal' => $this->format($goal, $this->clientTimezone($request))], 201);
    }

    public function update(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 404);
        $goal->update($this->validated($request));
        $formatted = $this->format($goal->fresh(), $this->clientTimezone($request));
        $this->notifyMilestone($goal, $formatted);

        return response()->json(['goal' => $formatted]);
    }

    public function destroy(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 404);
        $goal->delete();
        return response()->json(['message' => 'Goal deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:160', 'target_count' => 'required|integer|min:1|max:100000',
            'starts_on' => 'required|date', 'ends_on' => 'required|date|after_or_equal:starts_on',
            'category' => 'nullable|string|max:100',
        ]);
    }

    private function format(Goal $goal, string $timezone): array
    {
        $userTasks = $goal->user->tasks();
        $periodStart = Carbon::parse($goal->starts_on->format('Y-m-d'), $timezone)
            ->startOfDay()
            ->timezone(config('app.timezone'));
        $periodEnd = Carbon::parse($goal->ends_on->format('Y-m-d'), $timezone)
            ->endOfDay()
            ->timezone(config('app.timezone'));
        $completedQuery = (clone $userTasks)->where('status', 'completed')
            ->whereBetween('updated_at', [$periodStart, $periodEnd]);
        $scheduledQuery = (clone $userTasks)->active()->where('status', 'pending')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '>=', $goal->starts_on)
            ->whereDate('due_date', '<=', $goal->ends_on);
        if ($goal->category) {
            $completedQuery->where('category', $goal->category);
            $scheduledQuery->where('category', $goal->category);
        }
        $completed = $completedQuery->count();
        $remaining = max(0, $goal->target_count - $completed);
        $deadlinePassed = Carbon::now($timezone)->toDateString() > $goal->ends_on->format('Y-m-d');
        $state = $completed >= $goal->target_count ? 'completed' : ($deadlinePassed ? 'expired' : 'active');
        $message = match ($state) {
            'completed' => "Well done! You achieved your weekly goal! Keep up the great work! You completed {$completed} of {$goal->target_count} planned tasks within the goal period.",
            'expired' => $completed > 0
                ? "Good effort! You completed {$completed} of {$goal->target_count} planned tasks. You didn't reach your target this time, but you can build on your progress next week."
                : "This week didn't go as planned, and that's okay. Try setting a smaller target and taking one task at a time next week.",
            default => $completed > 0
                ? "You're making progress! You've completed {$completed} of {$goal->target_count} tasks. Just {$remaining} more to reach your goal."
                : 'Every great achievement starts with one step. Complete your first task to get started!',
        };
        $scheduledOutstanding = (clone $scheduledQuery)->count();
        $nextDeadlineTask = (clone $scheduledQuery)
            ->orderBy('due_date')
            ->orderByRaw("COALESCE(due_time, '23:59:59')")
            ->first(['due_date', 'due_time']);
        return [
            'id' => $goal->id, 'title' => $goal->title, 'target_count' => $goal->target_count,
            'starts_on' => $goal->starts_on->format('Y-m-d'), 'ends_on' => $goal->ends_on->format('Y-m-d'),
            'category' => $goal->category, 'completed_count' => $completed,
            'remaining_count' => $remaining,
            'scheduled_outstanding_count' => $scheduledOutstanding,
            'next_task_deadline' => $nextDeadlineTask ? [
                'date' => $nextDeadlineTask->due_date->format('Y-m-d'),
                'time' => $nextDeadlineTask->due_time,
            ] : null,
            'summary' => $remaining === 0
                ? "Target reached: {$completed} of {$goal->target_count} completed."
                : "{$completed} of {$goal->target_count} completed; {$remaining} remaining.",
            'progress_basis' => 'Completed tasks are counted by completed status and last-updated date within the goal period; no dedicated completion timestamp is stored.',
            'progress' => min(100, (int) round($completed / max(1, $goal->target_count) * 100)),
            'status' => $completed >= $goal->target_count ? 'completed' : ($deadlinePassed ? 'overdue' : 'in_progress'),
            'feedback_state' => $state,
            'feedback_message' => $message,
        ];
    }

    private function notifyMilestone(Goal $goal, array $formatted): void
    {
        if (! in_array($formatted['feedback_state'], ['completed', 'expired'], true)) {
            return;
        }

        $completed = $formatted['completed_count'];
        $title = $formatted['feedback_state'] === 'completed' ? 'Weekly goal achieved' : 'Weekly goal ended';

        $goal->user->inAppNotifications()->firstOrCreate(
            ['dedupe_key' => "weekly-goal:{$goal->id}:{$formatted['feedback_state']}"],
            [
                'type' => 'weekly_goal',
                'title' => $title,
                'message' => $formatted['feedback_message'],
                'metadata' => [
                    'goal_id' => $goal->id,
                    'feedback_state' => $formatted['feedback_state'],
                    'completed_count' => $completed,
                    'target_count' => $formatted['target_count'],
                ],
            ]
        );
    }

    private function clientTimezone(Request $request): string
    {
        $timezone = $request->header('X-Client-Timezone');

        return is_string($timezone) && in_array($timezone, timezone_identifiers_list(), true)
            ? $timezone
            : config('app.timezone');
    }
}

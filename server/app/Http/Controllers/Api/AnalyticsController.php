<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tasks = $user->tasks();

        $totalTasks = $tasks->count();
        $completedTasks = (clone $tasks)->where('status', 'completed')->count();
        $pendingTasks = (clone $tasks)->where('status', 'pending')->count();
        $overdueTasks = (clone $tasks)->where('status', 'pending')->whereDate('due_date', '<', now()->toDateString())->count();
        $all = (clone $tasks)->get(['status', 'category', 'priority_score', 'due_date', 'updated_at']);

        $statusChart = [
            ['name' => 'Completed', 'value' => $completedTasks],
            ['name' => 'In progress', 'value' => max(0, $pendingTasks - $overdueTasks)],
            ['name' => 'Overdue', 'value' => $overdueTasks],
        ];
        $categoryChart = $all->groupBy(fn ($task) => $task->category ?: 'Uncategorized')->map(fn ($items, $name) => ['name' => $name, 'value' => $items->count()])->values();
        $priorityChart = collect(['High' => 8, 'Medium' => 5, 'Low' => 0])->map(fn ($minimum, $name) => ['name' => $name, 'value' => $all->filter(fn ($task) => $name === 'High' ? $task->priority_score >= 8 : ($name === 'Medium' ? $task->priority_score >= 5 && $task->priority_score < 8 : $task->priority_score < 5))->count()])->values();
        $trendChart = collect(range(6, 0))->map(function ($daysAgo) use ($user) {
            $date = now()->subDays($daysAgo);
            return ['date' => $date->format('M j'), 'completed' => $user->tasks()->where('status', 'completed')->whereDate('updated_at', $date)->count()];
        })->values();
        $dueChart = $all->filter(fn ($task) => $task->due_date)->groupBy(fn ($task) => $task->due_date->format('M j'))->map(fn ($items, $date) => ['date' => $date, 'value' => $items->count()])->values()->take(8);

        return response()->json([
            'stats' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'pending_tasks' => $pendingTasks,
                'overdue_tasks' => $overdueTasks,
            ],
            'charts' => [
                'status' => $statusChart,
                'category' => $categoryChart,
                'priority' => $priorityChart,
                'completion_trend' => $trendChart,
                'due_dates' => $dueChart,
            ],
            'completion_rate' => $totalTasks ? round($completedTasks / $totalTasks * 100, 1) : 0,
        ]);
    }
}

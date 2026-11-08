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

        $statusChart = [
            ['name' => 'Completed', 'value' => $completedTasks],
            ['name' => 'Pending', 'value' => $pendingTasks],
        ];

        return response()->json([
            'stats' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'pending_tasks' => $pendingTasks,
                'overdue_tasks' => $overdueTasks,
            ],
            'charts' => [
                'status' => $statusChart,
            ],
        ]);
    }
}

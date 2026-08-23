<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $tasks = $user->tasks();

        $totalTasks = $tasks->count();
        $completedTasks = (clone $tasks)->where('status', 'completed')->count();
        $pendingTasks = (clone $tasks)->where('status', 'pending')->count();
        $averageScore = round((clone $tasks)->avg('priority_score') ?? 0, 2);

        $statusChart = [
            ['name' => 'Completed', 'value' => $completedTasks],
            ['name' => 'Pending', 'value' => $pendingTasks],
        ];

        $priorityDistribution = $user->tasks()
            ->select(
                DB::raw("CASE
                    WHEN priority_score >= 8 THEN 'High (8-10)'
                    WHEN priority_score >= 5 THEN 'Medium (5-7.9)'
                    ELSE 'Low (0-4.9)'
                END as priority_range"),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('priority_range')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->priority_range,
                'value' => (int) $row->count,
            ]);

        $scoreByStatus = $user->tasks()
            ->select('status', DB::raw('AVG(priority_score) as avg_score'))
            ->groupBy('status')
            ->get()
            ->map(fn ($row) => [
                'name' => ucfirst($row->status),
                'value' => round((float) $row->avg_score, 2),
            ]);

        return response()->json([
            'stats' => [
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'pending_tasks' => $pendingTasks,
                'average_priority_score' => $averageScore,
            ],
            'charts' => [
                'status' => $statusChart,
                'priority_distribution' => $priorityDistribution,
                'score_by_status' => $scoreByStatus,
            ],
        ]);
    }
}

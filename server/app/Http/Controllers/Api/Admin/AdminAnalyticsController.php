<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DecisionAnalysis;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $year = $request->integer('year', now()->year);

        return response()->json([
            'tasks_per_month' => Task::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->whereYear('created_at', $year)
                ->groupBy('month')
                ->orderBy('month')
                ->get(),
            'users_registered' => User::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->whereYear('created_at', $year)
                ->groupBy('month')
                ->orderBy('month')
                ->get(),
            'priority_distribution' => [
                ['level' => 'high', 'count' => Task::where('priority_score', '>=', 8)->count()],
                ['level' => 'medium', 'count' => Task::whereBetween('priority_score', [5, 7.99])->count()],
                ['level' => 'low', 'count' => Task::where('priority_score', '<', 5)->count()],
            ],
            'decision_frequency' => DecisionAnalysis::selectRaw('MONTH(created_at) as month, COUNT(*) as count')
                ->whereYear('created_at', $year)
                ->groupBy('month')
                ->orderBy('month')
                ->get(),
            'completed_vs_pending' => [
                ['status' => 'completed', 'count' => Task::where('status', 'completed')->count()],
                ['status' => 'pending', 'count' => Task::where('status', 'pending')->count()],
            ],
            'weather_distribution' => Task::select('weather_condition', DB::raw('COUNT(*) as count'))
                ->whereNotNull('weather_condition')
                ->groupBy('weather_condition')
                ->orderByDesc('count')
                ->get(),
            'most_active_users' => User::withCount('decisionAnalyses')
                ->orderByDesc('decision_analyses_count')
                ->take(10)
                ->get(['id', 'name', 'email']),
        ]);
    }
}

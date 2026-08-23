<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\DecisionAnalysis;
use App\Models\DecisionComparison;
use App\Models\Task;
use App\Models\User;
use App\Services\WeatherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function __construct(private readonly WeatherService $weatherService)
    {
    }

    public function index(): JsonResponse
    {
        $today = now()->startOfDay();

        return response()->json([
            'stats' => [
                'total_users' => User::count(),
                'active_users' => User::where('is_active', true)->count(),
                'total_tasks' => Task::count(),
                'total_decisions' => DecisionAnalysis::count() + DecisionComparison::count(),
                'todays_decisions' => DecisionAnalysis::whereDate('created_at', $today)->count(),
                'pending_tasks' => Task::where('status', 'pending')->count(),
                'completed_tasks' => Task::where('status', 'completed')->count(),
            ],
            'weather_api_status' => $this->checkWeatherApi(),
            'recent_notifications' => AdminNotification::latest()->take(5)->get(),
        ]);
    }

    private function checkWeatherApi(): array
    {
        try {
            $result = $this->weatherService->searchCities('London', 1);

            return [
                'status' => count($result) > 0 ? 'operational' : 'degraded',
                'provider' => 'Open-Meteo',
            ];
        } catch (\Throwable) {
            return ['status' => 'error', 'provider' => 'Open-Meteo'];
        }
    }
}

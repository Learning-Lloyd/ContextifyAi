<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;
use Throwable;

class AdminHealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $database = ['status' => 'unavailable', 'response_ms' => null];
        $started = microtime(true);
        try {
            DB::select('SELECT 1');
            $database = ['status' => 'reachable', 'response_ms' => (int) round((microtime(true) - $started) * 1000)];
        } catch (Throwable) {
            // Keep diagnostics free of connection strings and exception details.
        }

        $reminderScheduled = collect(Schedule::events())->contains(
            fn ($event) => str_contains((string) $event->command, 'contextify:generate-task-reminders')
        );

        return response()->json([
            'application' => ['status' => 'operational'],
            'api' => ['status' => 'operational'],
            'database' => $database,
            'providers' => [
                'gemini' => ['status' => config('ai.enabled') && filled(config('ai.api_key')) ? 'configured_not_checked' : 'not_configured'],
                'weather' => ['status' => 'not_checked'],
            ],
            'scheduler' => [
                'reminder_job' => $reminderScheduled ? 'registered' : 'not_registered',
                'last_execution' => 'not_tracked',
            ],
            'recent_errors' => ['status' => 'not_measured'],
            'checked_at' => now()->toIso8601String(),
        ]);
    }
}

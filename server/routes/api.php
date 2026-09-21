<?php

use App\Http\Controllers\Api\Admin\AdminAnalyticsController;
use App\Http\Controllers\Api\Admin\AdminAuditController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminDecisionController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\AdminReportController;
use App\Http\Controllers\Api\Admin\AdminTaskController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\DecisionLabController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\AdminFeedbackController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\ImportanceAnalysisController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskScoringController;
use App\Http\Controllers\Api\WeatherController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/analytics', [AnalyticsController::class, 'index']);
    Route::get('/calendar', [CalendarController::class, 'index']);

    Route::get('/weather/search', [WeatherController::class, 'search']);
    Route::get('/weather/current', [WeatherController::class, 'current']);

    Route::get('/tasks', [TaskController::class, 'index']);
    Route::post('/tasks', [TaskController::class, 'store']);
    Route::post('/tasks/analyze-importance', [ImportanceAnalysisController::class, 'analyze']);
    Route::post('/tasks/scoring-preview', [TaskScoringController::class, 'preview']);
    Route::get('/tasks/calendar-context', [TaskScoringController::class, 'calendarContext']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::put('/tasks/{task}', [TaskController::class, 'update']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::patch('/tasks/{task}/toggle-complete', [TaskController::class, 'toggleComplete']);
    Route::post('/tasks/{task}/archive', [TaskController::class, 'archive']);
    Route::post('/tasks/{task}/restore', [TaskController::class, 'restore']);
    Route::post('/tasks/{task}/duplicate', [TaskController::class, 'duplicate']);

    Route::post('/decision-lab/compare', [DecisionLabController::class, 'compare']);
    Route::post('/decision-lab/analyze', [DecisionLabController::class, 'analyze']);
    Route::post('/decision-lab/simulate', [DecisionLabController::class, 'simulate']);
    Route::post('/decision-lab/save-simulation', [DecisionLabController::class, 'saveSimulation']);
    Route::get('/decision-lab/insights', [DecisionLabController::class, 'insights']);
    Route::get('/decision-lab/timeline', [DecisionLabController::class, 'timeline']);
    Route::get('/decision-lab/analyses', [DecisionLabController::class, 'analysisHistory']);
    Route::post('/decision-lab/save', [DecisionLabController::class, 'store']);
    Route::get('/decision-lab/history', [DecisionLabController::class, 'history']);

    Route::get('/feedback', [FeedbackController::class, 'index']);
    Route::post('/feedback', [FeedbackController::class, 'store']);

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/dashboard', [AdminDashboardController::class, 'index']);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword']);
        Route::post('/users/{user}/toggle-active', [AdminUserController::class, 'toggleActive']);
        Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);

        Route::get('/tasks', [AdminTaskController::class, 'index']);
        Route::delete('/tasks/{task}', [AdminTaskController::class, 'destroy']);

        Route::get('/decisions', [AdminDecisionController::class, 'index']);
        Route::get('/decisions/{decision}', [AdminDecisionController::class, 'show']);

        Route::get('/audit-logs', [AdminAuditController::class, 'index']);
        Route::get('/analytics', [AdminAnalyticsController::class, 'index']);
        Route::get('/reports/export', [AdminReportController::class, 'export']);

        Route::get('/notifications', [AdminNotificationController::class, 'index']);
        Route::patch('/notifications/{notification}/read', [AdminNotificationController::class, 'markRead']);

        Route::get('/feedback', [AdminFeedbackController::class, 'index']);
        Route::get('/feedback/{feedback}', [AdminFeedbackController::class, 'show']);
        Route::patch('/feedback/{feedback}', [AdminFeedbackController::class, 'update']);
        Route::post('/feedback/{feedback}/respond', [AdminFeedbackController::class, 'respond']);
        Route::delete('/feedback/{feedback}', [AdminFeedbackController::class, 'destroy']);
    });
});

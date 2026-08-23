<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = $request->user()
            ->tasks()
            ->whereNotNull('due_date')
            ->orderBy('due_date')
            ->orderByDesc('priority_score')
            ->get()
            ->map(fn (Task $task) => [
                'id' => $task->id,
                'title' => $task->title,
                'due_date' => $task->due_date?->format('Y-m-d'),
                'due_time' => $task->due_time,
                'priority_score' => $task->priority_score,
                'priority_level' => $task->priority_level,
                'status' => $task->status,
                'location' => $task->location,
                'countdown' => $task->countdown,
            ]);

        $byDate = $tasks->groupBy('due_date')->map(fn ($group, $date) => [
            'date' => $date,
            'tasks' => $group->values(),
            'count' => $group->count(),
        ])->values();

        return response()->json([
            'tasks' => $tasks,
            'calendar' => $byDate,
        ]);
    }
}

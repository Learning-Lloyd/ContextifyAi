<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CalendarContextService;
use App\Services\TaskScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskScoringController extends Controller
{
    public function __construct(
        private readonly TaskScoringService $taskScoringService,
        private readonly CalendarContextService $calendarContextService
    ) {
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'due_date' => 'nullable|date',
            'due_time' => 'nullable|date_format:H:i',
        ]);

        $preview = $this->taskScoringService->preview(
            $request->user(),
            $validated['title'],
            $validated['description'] ?? null,
            $validated['due_date'] ?? null,
            $validated['due_time'] ?? null
        );

        return response()->json(['preview' => $preview]);
    }

    public function calendarContext(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'due_date' => 'nullable|date',
            'exclude_task_id' => 'nullable|integer',
        ]);

        $context = $this->calendarContextService->analyze(
            $request->user(),
            $validated['due_date'] ?? null,
            $validated['exclude_task_id'] ?? null
        );

        return response()->json(['calendar_context' => $context]);
    }
}

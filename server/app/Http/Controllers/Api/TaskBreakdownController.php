<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\TaskBreakdownService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskBreakdownController extends Controller
{
    public function __construct(private readonly TaskBreakdownService $service)
    {
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate(['task_id' => 'required|integer|exists:tasks,id']);
        $task = Task::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($validated['task_id']);

        $suggestions = $this->service->generate([
            'title' => $task->title,
            'description' => $task->description,
            'due_date' => $task->due_date?->format('Y-m-d'),
        ]);

        if ($suggestions === null) {
            return response()->json([
                'message' => 'AI task breakdown is unavailable. Check the AI provider connection and try again.',
            ], 503);
        }

        return response()->json(['subtasks' => $suggestions]);
    }
}

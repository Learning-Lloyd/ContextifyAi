<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminTaskController extends Controller
{
    public function __construct(private readonly AuditLogService $auditLogService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Task::with('user:id,name,email');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($date = $request->query('due_date')) {
            $query->whereDate('due_date', $date);
        }
        if ($priority = $request->query('priority_level')) {
            $query->where(function ($q) use ($priority) {
                match ($priority) {
                    'high' => $q->where('priority_score', '>=', 8),
                    'medium' => $q->whereBetween('priority_score', [5, 7.99]),
                    'low' => $q->where('priority_score', '<', 5),
                    default => null,
                };
            });
        }

        $tasks = $query->orderByDesc('priority_score')->paginate($request->integer('per_page', 20));

        return response()->json($tasks);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->auditLogService->log($request->user()->id, 'admin_task_delete', $request, [
            'task_id' => $task->id,
            'user_id' => $task->user_id,
        ]);

        $task->delete();

        return response()->json(['message' => 'Task deleted successfully']);
    }
}

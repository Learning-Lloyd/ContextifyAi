<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Goal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(['goals' => $request->user()->goals()->orderBy('ends_on')->get()->map(fn (Goal $goal) => $this->format($goal))]);
    }

    public function store(Request $request): JsonResponse
    {
        $goal = $request->user()->goals()->create($this->validated($request));
        return response()->json(['goal' => $this->format($goal)], 201);
    }

    public function update(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 404);
        $goal->update($this->validated($request));
        return response()->json(['goal' => $this->format($goal->fresh())]);
    }

    public function destroy(Request $request, Goal $goal): JsonResponse
    {
        abort_unless($goal->user_id === $request->user()->id, 404);
        $goal->delete();
        return response()->json(['message' => 'Goal deleted']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => 'required|string|max:160', 'target_count' => 'required|integer|min:1|max:100000',
            'starts_on' => 'required|date', 'ends_on' => 'required|date|after_or_equal:starts_on',
            'category' => 'nullable|string|max:100',
        ]);
    }

    private function format(Goal $goal): array
    {
        $query = $goal->user->tasks()->where('status', 'completed')->whereDate('updated_at', '>=', $goal->starts_on)->whereDate('updated_at', '<=', $goal->ends_on);
        if ($goal->category) $query->where('category', $goal->category);
        $completed = $query->count();
        return [
            'id' => $goal->id, 'title' => $goal->title, 'target_count' => $goal->target_count,
            'starts_on' => $goal->starts_on->format('Y-m-d'), 'ends_on' => $goal->ends_on->format('Y-m-d'),
            'category' => $goal->category, 'completed_count' => $completed,
            'progress' => min(100, (int) round($completed / max(1, $goal->target_count) * 100)),
            'status' => $completed >= $goal->target_count ? 'completed' : (now()->toDateString() > $goal->ends_on->format('Y-m-d') ? 'overdue' : 'in_progress'),
        ];
    }
}

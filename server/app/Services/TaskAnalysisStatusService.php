<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class TaskAnalysisStatusService
{
    /** @return array<int, bool> */
    public function forTasks(User $user, Collection $tasks): array
    {
        if ($tasks->isEmpty()) {
            return [];
        }

        $taskIds = $tasks->pluck('id')->map(fn ($id) => (int) $id)->all();
        $latestAnalysisAt = [];

        $user->decisionAnalyses()
            ->get(['task_ids', 'summary', 'created_at'])
            ->each(function ($analysis) use (&$latestAnalysisAt, $taskIds) {
                if (($analysis->summary['type'] ?? null) === 'what_if_scenario') {
                    return;
                }

                foreach ($analysis->task_ids ?? [] as $taskId) {
                    $taskId = (int) $taskId;
                    if (in_array($taskId, $taskIds, true)
                        && (! isset($latestAnalysisAt[$taskId]) || $analysis->created_at->gt($latestAnalysisAt[$taskId]))) {
                        $latestAnalysisAt[$taskId] = $analysis->created_at;
                    }
                }
            });

        return $tasks->mapWithKeys(function ($task) use ($latestAnalysisAt) {
            $analyzedAt = $latestAnalysisAt[(int) $task->id] ?? null;

            return [(int) $task->id => $analyzedAt !== null && $analyzedAt->gte($task->updated_at)];
        })->all();
    }
}

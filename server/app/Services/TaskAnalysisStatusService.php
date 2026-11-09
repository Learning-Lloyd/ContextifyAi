<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Collection;

class TaskAnalysisStatusService
{
    /** @return array<int, array{explanation:string, source:string}> Current saved explanation for each task. */
    public function analysisDetailsForTasks(User $user, Collection $tasks, ?string $timezone = null): array
    {
        if ($tasks->isEmpty()) {
            return [];
        }

        $taskById = $tasks->keyBy(fn ($task) => (int) $task->id);
        $details = [];
        foreach ($this->currentAnalyses($user) as $analysis) {
            $rankedTasks = $analysis->ranked_tasks ?? [];
            foreach ($rankedTasks as $rank => $rankedTask) {
                $id = (int) ($rankedTask['id'] ?? 0);
                if (! $taskById->has($id) || isset($details[$id])) {
                    continue;
                }

                $aiExplanations = $analysis->summary['ai_explanation']['task_explanations'] ?? [];
                $aiExplanation = $aiExplanations[$id] ?? $aiExplanations[(string) $id] ?? null;
                $explanation = $rankedTask['task_card_explanation'] ?? $aiExplanation;
                $source = $rankedTask['explanation_source'] ?? ($aiExplanation ? 'ai' : 'rule_based');
                if (! $explanation) {
                    $explanation = app(ExplanationService::class)->forTaskCard(
                        $rankedTask,
                        $rank + 1,
                        count($rankedTasks),
                        $timezone,
                        $rankedTasks
                    );
                    $source = 'rule_based';
                }

                $details[$id] = ['explanation' => (string) $explanation, 'source' => $source];
            }
        }

        return $details;
    }

    /** @return array<int, bool> */
    public function forTasks(User $user, Collection $tasks): array
    {
        if ($tasks->isEmpty()) {
            return [];
        }

        $taskIds = $tasks->pluck('id')->map(fn ($id) => (int) $id)->all();
        $latestAnalysisAt = [];
        foreach ($this->currentAnalyses($user) as $analysis) {
            foreach ($analysis->task_ids ?? [] as $taskId) {
                $taskId = (int) $taskId;
                if (in_array($taskId, $taskIds, true)
                    && (! isset($latestAnalysisAt[$taskId]) || $analysis->created_at->gt($latestAnalysisAt[$taskId]))) {
                    $latestAnalysisAt[$taskId] = $analysis->created_at;
                }
            }
        }

        return $tasks->mapWithKeys(function ($task) use ($latestAnalysisAt) {
            $analyzedAt = $latestAnalysisAt[(int) $task->id] ?? null;

            return [(int) $task->id => $analyzedAt !== null && $analyzedAt->gte($task->updated_at)];
        })->all();
    }

    private function currentAnalyses(User $user): Collection
    {
        $analyses = $user->decisionAnalyses()->latest()->get(['task_ids', 'ranked_tasks', 'summary', 'created_at'])
            ->reject(fn ($analysis) => ($analysis->summary['type'] ?? null) === 'what_if_scenario');
        $taskIds = $analyses->flatMap(fn ($analysis) => $analysis->task_ids ?? [])->unique()->values();
        if ($taskIds->isEmpty()) {
            return collect();
        }

        $tasksById = $user->tasks()->whereIn('id', $taskIds)->get(['id', 'updated_at'])->keyBy('id');

        return $analyses->filter(function ($analysis) use ($tasksById) {
            $taskIds = collect($analysis->task_ids ?? [])->unique();
            if ($taskIds->isEmpty() || $taskIds->count() !== $taskIds->filter(fn ($id) => $tasksById->has($id))->count()) {
                return false;
            }

            return $taskIds->every(fn ($id) => ! $tasksById[$id]->updated_at->gt($analysis->created_at));
        });
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Throwable;

class ExperimentalPriorityPredictionController extends Controller
{
    public function predict(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'task_ids' => 'required|array|min:1|max:50',
            'task_ids.*' => 'required|integer|distinct',
        ]);

        $tasks = Task::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('id', $validated['task_ids'])
            ->get();

        if ($tasks->count() !== count($validated['task_ids'])) {
            return response()->json(['message' => 'One or more selected tasks are unavailable.'], 403);
        }

        if ($tasks->contains(fn (Task $task) => $task->status !== 'pending' || $task->is_archived)) {
            return response()->json([
                'message' => 'Experimental predictions are available only for active, pending tasks.',
            ], 422);
        }

        $pendingCount = $request->user()->tasks()
            ->active()
            ->where('status', 'pending')
            ->count();

        $prepared = $tasks->map(function (Task $task) use ($pendingCount): array {
            $assignment = [
                'task_id' => $task->id,
                'title' => $task->title,
                'category' => $task->category ?? '',
                'importance' => $task->importance,
                'urgency' => $task->urgency,
                'days_remaining' => $task->due_date
                    ? (float) now()->startOfDay()->diffInDays($task->due_date->copy()->startOfDay(), false)
                    : null,
                'estimated_time_minutes' => $task->estimated_time_minutes,
                'time_availability' => $task->time_availability,
                'current_workload' => $task->current_workload,
                'other_pending_assignments' => max(0, $pendingCount - 1),
            ];

            $missingInputs = [];
            foreach (['importance', 'urgency', 'time_availability', 'current_workload'] as $factor) {
                $value = $assignment[$factor];
                if (! is_int($value) || $value < 1 || $value > 10) {
                    $missingInputs[] = $factor;
                }
            }

            $missingOptionalInputs = [];
            if (! $task->due_date) $missingOptionalInputs[] = 'deadline';
            if (! $task->estimated_time_minutes) $missingOptionalInputs[] = 'estimated duration';
            if (! $task->category) $missingOptionalInputs[] = 'category';
            if (! $task->description) $missingOptionalInputs[] = 'description';

            return [
                'assignment' => $assignment,
                'missing_inputs' => $missingInputs,
                'missing_optional_inputs' => $missingOptionalInputs,
                'importance_source' => $task->importance_source ?? 'legacy',
                'unverified_input_sources' => ['time availability', 'current workload'],
            ];
        })->values()->all();

        $validPrepared = array_values(array_filter($prepared, fn ($item) => $item['missing_inputs'] === []));
        $predictionsByTaskId = [];

        if ($validPrepared !== []) {
            try {
                $response = Http::acceptJson()
                    ->timeout((int) config('services.contextify_priority_model.timeout', 4))
                    ->post(config('services.contextify_priority_model.url'), [
                        'assignments' => array_column($validPrepared, 'assignment'),
                    ]);
            } catch (Throwable) {
                return response()->json([
                    'message' => 'The experimental model service is unavailable. Start the local Contextify ML service and try again.',
                ], 503);
            }

            if (! $response->successful()) {
                return response()->json([
                    'message' => 'The experimental model could not produce predictions right now.',
                ], 503);
            }

            foreach ((array) $response->json('predictions', []) as $prediction) {
                $predictionsByTaskId[(int) ($prediction['task_id'] ?? 0)] = $prediction;
            }
            $model = $response->json('model');
        } else {
            $model = null;
        }

        $predictions = collect($prepared)->map(function (array $item) use ($predictionsByTaskId): array {
            if ($item['missing_inputs'] !== []) {
                return [
                    'task_id' => $item['assignment']['task_id'],
                    'title' => $item['assignment']['title'],
                    'prediction_status' => 'insufficient_inputs',
                    'priority_category' => null,
                    'missing_inputs' => $item['missing_inputs'],
                    'suggested_next_step' => 'This task was not sent to the experimental model because one or more required scoring factors are missing or outside the 1–10 range.',
                    'prediction_type' => 'experimental_synthetic_data',
                ];
            }

            $id = (int) $item['assignment']['task_id'];
            $prediction = $predictionsByTaskId[$id] ?? null;
            if ($prediction === null) {
                return [
                    'task_id' => $id,
                    'title' => $item['assignment']['title'],
                    'prediction_status' => 'unavailable',
                    'priority_category' => null,
                    'suggested_next_step' => 'The experimental model did not return a result for this task.',
                    'prediction_type' => 'experimental_synthetic_data',
                ];
            }
            $prediction['prediction_status'] = 'predicted';
            $prediction['missing_optional_inputs'] = $item['missing_optional_inputs'];
            $prediction['importance_source'] = $item['importance_source'];
            $prediction['unverified_input_sources'] = $item['unverified_input_sources'];
            $prediction['review_required'] = true;
            return $prediction;
        })->values()->all();

        return response()->json(['predictions' => $predictions, 'model' => $model]);
    }
}

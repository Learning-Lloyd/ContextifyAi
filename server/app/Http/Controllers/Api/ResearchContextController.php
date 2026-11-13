<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ResearchContextPredictor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ResearchContextController extends Controller
{
    public function predict(Request $request, ResearchContextPredictor $predictor): JsonResponse
    {
        $validated = $request->validate([
            'tasks' => 'required|array|min:1|max:20',
            'tasks.*.id' => 'nullable|integer',
            'tasks.*.title' => 'required|string|min:1|max:255',
        ]);

        try {
            $predictions = array_map(static function (array $task) use ($predictor): array {
                return [
                    'task_id' => $task['id'] ?? null,
                    'title' => $task['title'],
                    ...$predictor->predict($task['title']),
                ];
            }, $validated['tasks']);
        } catch (RuntimeException $error) {
            return response()->json(['message' => $error->getMessage()], 503);
        }

        return response()->json([
            'model' => [
                'dataset' => 'MS-LaTTE human annotation research model',
                ...$predictor->modelDetails(),
            ],
            'notice' => 'These are supplementary research suggestions from external task annotations. They do not set task context or affect the Contextify priority score.',
            'predictions' => $predictions,
        ]);
    }
}

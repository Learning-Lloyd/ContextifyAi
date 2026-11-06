<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TaskDescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskDescriptionController extends Controller
{
    public function __construct(private readonly TaskDescriptionService $service)
    {
    }

    public function generate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
        ]);

        $description = $this->service->generate($validated['title'], $validated['description'] ?? null);
        if ($description === null) {
            return response()->json([
                'message' => 'Description help is unavailable. Check that the AI provider is configured, then try again.',
            ], 503);
        }

        return response()->json(['description' => $description]);
    }
}

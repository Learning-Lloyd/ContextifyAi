<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ImportanceAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ImportanceAnalysisController extends Controller
{
    public function __construct(private readonly ImportanceAnalysisService $importanceAnalysisService)
    {
    }

    public function analyze(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
        ]);

        $result = $this->importanceAnalysisService->analyze(
            $validated['title'],
            $validated['description'] ?? null
        );

        return response()->json(['analysis' => $result]);
    }
}

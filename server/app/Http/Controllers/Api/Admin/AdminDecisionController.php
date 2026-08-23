<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DecisionAnalysis;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminDecisionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = DecisionAnalysis::with('user:id,name,email');

        if ($userId = $request->query('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        $decisions = $query->latest()->paginate($request->integer('per_page', 15));

        return response()->json($decisions);
    }

    public function show(DecisionAnalysis $decision): JsonResponse
    {
        return response()->json([
            'decision' => $decision->load('user:id,name,email'),
        ]);
    }
}

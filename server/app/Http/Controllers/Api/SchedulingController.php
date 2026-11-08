<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SchedulingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchedulingController extends Controller
{
    public function __construct(private readonly SchedulingService $service)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['date' => 'nullable|date_format:Y-m-d']);
        $plan = $this->service->suggest($request->user(), $validated['date'] ?? now()->toDateString());

        return response()->json(['schedule' => $plan]);
    }
}

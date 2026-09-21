<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Display a listing of feedback submitted by the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $feedbacks = $request->user()
            ->feedbacks()
            ->with('responder:id,name')
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return response()->json($feedbacks);
    }

    /**
     * Store a newly submitted feedback from the authenticated user.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'nullable|string|in:general,bug,feature,usability,prioritization',
            'rating' => 'nullable|integer|min:1|max:5',
            'message' => 'required|string|min:3|max:2000',
        ]);

        $feedback = $request->user()->feedbacks()->create([
            'type' => $validated['type'] ?? 'general',
            'rating' => $validated['rating'] ?? null,
            'message' => trim($validated['message']),
            'status' => 'pending',
        ]);

        $this->auditLogService->log($request->user()->id, 'feedback_submitted', $request, [
            'feedback_id' => $feedback->id,
            'type' => $feedback->type,
            'rating' => $feedback->rating,
        ]);

        $this->auditLogService->notifyAdmin(
            'feedback',
            'New User Feedback',
            "User {$request->user()->name} submitted a {$feedback->type} feedback.",
            ['feedback_id' => $feedback->id]
        );

        return response()->json([
            'message' => 'Thank you for your feedback! It has been submitted successfully.',
            'feedback' => $feedback->load('user:id,name,email'),
        ], 201);
    }
}

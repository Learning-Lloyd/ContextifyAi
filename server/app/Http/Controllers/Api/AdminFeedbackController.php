<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminFeedbackController extends Controller
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {
    }

    /**
     * Display a listing of all feedback with filtering, searching, and summary stats.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Feedback::with(['user:id,name,email', 'responder:id,name,email']);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = '%' . trim($request->search) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', $search)
                    ->orWhere('admin_response', 'like', $search)
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', $search)
                            ->orWhere('email', 'like', $search);
                    });
            });
        }

        $feedbacks = $query->latest()->paginate($request->integer('per_page', 15));

        // Aggregate statistics for the dashboard
        $stats = [
            'total' => Feedback::count(),
            'pending' => Feedback::where('status', 'pending')->count(),
            'reviewed' => Feedback::where('status', 'reviewed')->count(),
            'resolved' => Feedback::where('status', 'resolved')->count(),
            'avg_rating' => round((float) Feedback::whereNotNull('rating')->avg('rating'), 1),
        ];

        return response()->json([
            'feedbacks' => $feedbacks,
            'stats' => $stats,
        ]);
    }

    /**
     * Display details of a specific feedback.
     */
    public function show(Feedback $feedback): JsonResponse
    {
        $feedback->load(['user:id,name,email', 'responder:id,name,email']);

        return response()->json([
            'feedback' => $feedback,
        ]);
    }

    /**
     * Update status and/or admin response of a feedback.
     */
    public function update(Request $request, Feedback $feedback): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'sometimes|required|in:pending,reviewed,resolved',
            'admin_response' => 'nullable|string|max:3000',
        ]);

        $updates = [];

        if (isset($validated['status'])) {
            $updates['status'] = $validated['status'];
        }

        if (array_key_exists('admin_response', $validated)) {
            $updates['admin_response'] = $validated['admin_response'];
            if (! empty($validated['admin_response'])) {
                $updates['responded_at'] = now();
                $updates['responded_by'] = $request->user()->id;
                // If status was pending, automatically advance to reviewed
                if (! isset($validated['status']) && $feedback->status === 'pending') {
                    $updates['status'] = 'reviewed';
                }
            }
        }

        $feedback->update($updates);

        $this->auditLogService->log($request->user()->id, 'feedback_updated', $request, [
            'feedback_id' => $feedback->id,
            'status' => $feedback->status,
            'has_response' => ! empty($feedback->admin_response),
        ]);

        return response()->json([
            'message' => 'Feedback updated successfully.',
            'feedback' => $feedback->load(['user:id,name,email', 'responder:id,name,email']),
        ]);
    }

    /**
     * Dedicated action to submit an administrative response to feedback.
     */
    public function respond(Request $request, Feedback $feedback): JsonResponse
    {
        $validated = $request->validate([
            'response' => 'required|string|min:2|max:3000',
            'status' => 'nullable|in:reviewed,resolved',
        ]);

        $feedback->update([
            'admin_response' => trim($validated['response']),
            'responded_at' => now(),
            'responded_by' => $request->user()->id,
            'status' => $validated['status'] ?? ($feedback->status === 'pending' ? 'reviewed' : $feedback->status),
        ]);

        $this->auditLogService->log($request->user()->id, 'feedback_responded', $request, [
            'feedback_id' => $feedback->id,
            'status' => $feedback->status,
        ]);

        return response()->json([
            'message' => 'Response recorded and sent to user.',
            'feedback' => $feedback->load(['user:id,name,email', 'responder:id,name,email']),
        ]);
    }

    /**
     * Delete a feedback record.
     */
    public function destroy(Request $request, Feedback $feedback): JsonResponse
    {
        $feedbackId = $feedback->id;
        $feedback->delete();

        $this->auditLogService->log($request->user()->id, 'feedback_deleted', $request, [
            'feedback_id' => $feedbackId,
        ]);

        return response()->json([
            'message' => 'Feedback deleted successfully.',
        ]);
    }
}

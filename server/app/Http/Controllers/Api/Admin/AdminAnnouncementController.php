<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Services\AnnouncementNotificationService;
use App\Services\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class AdminAnnouncementController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['announcements' => Announcement::query()->latest()->paginate(30)]);
    }

    public function store(Request $request, AuditLogService $auditLogService, AnnouncementNotificationService $announcementNotifications): JsonResponse
    {
        $validated = $this->validated($request);
        if (! empty($validated['request_key'])) {
            $existing = Announcement::where('request_key', $validated['request_key'])->first();
            if ($existing) {
                return response()->json(['message' => 'This announcement request was already saved.', 'announcement' => $existing], 200);
            }
        }
        $announcement = DB::transaction(function () use ($validated, $request, $auditLogService, $announcementNotifications): Announcement {
            $validated['published_at'] = $validated['status'] === 'published' ? now() : null;
            $announcement = Announcement::create($validated + ['created_by' => $request->user()->id]);
            $announcementNotifications->publishToActiveUsers($announcement);
            $auditLogService->log($request->user()->id, 'admin_announcement_created', $request, ['announcement_id' => $announcement->id]);

            return $announcement;
        });

        return response()->json(['message' => 'Announcement created.', 'announcement' => $announcement], 201);
    }

    public function update(Request $request, Announcement $announcement, AuditLogService $auditLogService, AnnouncementNotificationService $announcementNotifications): JsonResponse
    {
        DB::transaction(function () use ($request, $announcement, $auditLogService, $announcementNotifications): void {
            $validated = $this->validated($request);
            if ($announcement->status !== 'published' && $validated['status'] === 'published') {
                $validated['published_at'] = now();
            } elseif ($announcement->status === 'published') {
                $validated['published_at'] = $announcement->published_at ?? $announcement->updated_at;
            } else {
                $validated['published_at'] = null;
            }
            $announcement->update($validated);
            $announcementNotifications->publishToActiveUsers($announcement->fresh());
            $auditLogService->log($request->user()->id, 'admin_announcement_updated', $request, ['announcement_id' => $announcement->id]);
        });

        return response()->json(['message' => 'Announcement updated.', 'announcement' => $announcement->fresh()]);
    }

    public function destroy(Request $request, Announcement $announcement, AuditLogService $auditLogService, AnnouncementNotificationService $announcementNotifications): JsonResponse
    {
        if ($announcement->status === 'published') {
            throw ValidationException::withMessages(['announcement' => 'Unpublish this announcement before removing it.']);
        }
        $id = $announcement->id;
        DB::transaction(function () use ($announcement, $request, $auditLogService, $announcementNotifications, $id): void {
            $announcementNotifications->removeForAnnouncement($announcement);
            $announcement->delete();
            $auditLogService->log($request->user()->id, 'admin_announcement_deleted', $request, ['announcement_id' => $id]);
        });

        return response()->json(['message' => 'Draft announcement removed.']);
    }

    private function validated(Request $request): array
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'max:10000'],
            'request_key' => ['nullable', 'string', 'max:64'],
            'status' => ['required', 'in:draft,published'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
        ]);
        if (! empty($validated['starts_at']) && ! empty($validated['expires_at'])
            && Carbon::parse($validated['expires_at'])->lessThanOrEqualTo(Carbon::parse($validated['starts_at']))) {
            throw ValidationException::withMessages(['expires_at' => 'The expiry must be later than the start time.']);
        }

        return $validated;
    }
}

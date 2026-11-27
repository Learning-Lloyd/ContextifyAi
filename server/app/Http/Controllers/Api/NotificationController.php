<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\UserNotification;
use App\Services\AnnouncementNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request, AnnouncementNotificationService $announcementNotifications): JsonResponse
    {
        $user = $request->user();
        $activeAnnouncementKeys = $announcementNotifications->syncForUser($user);
        $visibleNotifications = fn () => $user->inAppNotifications()->visibleToUsers($activeAnnouncementKeys);
        $notifications = $visibleNotifications()
            ->latest()
            ->paginate(min(50, max(1, $request->integer('per_page', 20))));

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $visibleNotifications()->whereNull('read_at')->count(),
        ]);
    }

    public function markAsRead(Request $request, UserNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === $request->user()->id, 404);
        $notification->forceFill(['read_at' => $notification->read_at ?? now()])->save();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllAsRead(Request $request, AnnouncementNotificationService $announcementNotifications): JsonResponse
    {
        $user = $request->user();
        $activeAnnouncementKeys = $announcementNotifications->syncForUser($user);
        $user->inAppNotifications()->visibleToUsers($activeAnnouncementKeys)->whereNull('read_at')->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use Illuminate\Http\JsonResponse;

class AdminNotificationController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'notifications' => AdminNotification::latest()->paginate(20),
            'unread_count' => AdminNotification::where('is_read', false)->count(),
        ]);
    }

    public function markRead(AdminNotification $notification): JsonResponse
    {
        $notification->update(['is_read' => true]);

        return response()->json(['message' => 'Notification marked as read']);
    }
}

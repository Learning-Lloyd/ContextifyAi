<?php

namespace App\Services;

use App\Models\AdminNotification;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogService
{
    public function log(?int $userId, string $action, ?Request $request = null, array $metadata = []): AuditLog
    {
        return AuditLog::create([
            'user_id' => $userId,
            'action' => $action,
            'ip_address' => $request?->ip(),
            'metadata' => $metadata,
        ]);
    }

    public function notifyAdmin(string $type, string $title, string $message, array $metadata = []): AdminNotification
    {
        return AdminNotification::create([
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'metadata' => $metadata,
        ]);
    }
}

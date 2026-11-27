<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserNotification extends Model
{
    protected $fillable = [
        'user_id',
        'task_id',
        'type',
        'title',
        'message',
        'dedupe_key',
        'read_at',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'read_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function scopeVisibleToUsers($query, array $activeAnnouncementKeys)
    {
        return $query->where(function ($notifications) use ($activeAnnouncementKeys) {
            $notifications->where('type', '!=', 'announcement');
            if ($activeAnnouncementKeys !== []) {
                $notifications->orWhereIn('dedupe_key', $activeAnnouncementKeys);
            }
        });
    }
}

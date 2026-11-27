<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Collection;

class AnnouncementNotificationService
{
    /**
     * Create or refresh one bell notification for each active user.
     * The notification table's unique dedupe_key makes repeated publication safe.
     */
    public function publishToActiveUsers(Announcement $announcement): void
    {
        if (! Announcement::visibleToUsers()->whereKey($announcement->id)->exists()) {
            return;
        }

        User::query()->where('is_active', true)->select('id')->chunkById(250, function (Collection $users) use ($announcement): void {
            $this->upsertForUserIds($announcement, $users->pluck('id')->all());
        });
    }

    /**
     * Ensure current announcements appear for a user who registers while they are
     * still active, or whose scheduled start time has just arrived.
     *
     * @return array<int, string> Active announcement deduplication keys.
     */
    public function syncForUser(User $user): array
    {
        $announcements = Announcement::visibleToUsers()->get();
        foreach ($announcements as $announcement) {
            $this->upsertForUserIds($announcement, [$user->id]);
        }

        return $announcements->map(fn (Announcement $announcement): string => $this->dedupeKey($announcement, $user->id))->all();
    }

    public function removeForAnnouncement(Announcement $announcement): void
    {
        UserNotification::query()
            ->where('type', 'announcement')
            ->where('dedupe_key', 'like', 'announcement:'.$announcement->id.':%')
            ->delete();
    }

    private function upsertForUserIds(Announcement $announcement, array $userIds): void
    {
        if ($userIds === []) {
            return;
        }

        $now = now();
        $publishedAt = $announcement->published_at ?? $announcement->updated_at ?? $announcement->created_at;
        $rows = array_map(fn (int $userId): array => [
            'user_id' => $userId,
            'task_id' => null,
            'type' => 'announcement',
            'title' => $announcement->title,
            'message' => $announcement->body,
            'dedupe_key' => $this->dedupeKey($announcement, $userId),
            'read_at' => null,
            'metadata' => json_encode([
                'announcement_id' => $announcement->id,
                'published_at' => $publishedAt?->toIso8601String(),
            ], JSON_THROW_ON_ERROR),
            'created_at' => $now,
            'updated_at' => $now,
        ], $userIds);

        // Updating content preserves read_at and created_at; the unique key
        // prevents a second notification when an admin edits or republishes.
        UserNotification::query()->upsert(
            $rows,
            ['dedupe_key'],
            ['title', 'message', 'metadata', 'updated_at']
        );
    }

    private function dedupeKey(Announcement $announcement, int $userId): string
    {
        return 'announcement:'.$announcement->id.':'.$userId;
    }
}

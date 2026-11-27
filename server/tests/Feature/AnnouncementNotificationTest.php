<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AnnouncementNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishing_notifies_active_users_once_and_edits_refresh_content_without_unreading(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create();
        User::factory()->create(['is_active' => false]);
        Sanctum::actingAs($admin);

        $payload = [
            'title' => 'Service update',
            'body' => 'The workspace will be updated tonight.',
            'status' => 'published',
            'request_key' => 'release-announcement-once',
        ];
        $announcement = $this->postJson('/api/admin/announcements', $payload)
            ->assertCreated()->json('announcement');

        $this->assertDatabaseCount('user_notifications', 2);
        $memberNotice = UserNotification::where('user_id', $member->id)->firstOrFail();
        $this->assertSame('announcement:'.$announcement['id'].':'.$member->id, $memberNotice->dedupe_key);
        $this->assertSame($announcement['id'], $memberNotice->metadata['announcement_id']);
        $initialPublicationTime = $memberNotice->metadata['published_at'];
        $this->assertNotEmpty($initialPublicationTime);

        Sanctum::actingAs($member);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonCount(1, 'notifications.data')
            ->assertJsonPath('notifications.data.0.title', $payload['title'])
            ->assertJsonPath('notifications.data.0.message', $payload['body']);
        $this->patchJson('/api/notifications/'.$memberNotice->id.'/read')->assertOk();
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('unread_count', 0);
        $memberNotice->refresh();
        $this->assertNotNull($memberNotice->read_at);

        Sanctum::actingAs($admin);
        $this->postJson('/api/admin/announcements', $payload)->assertOk()
            ->assertJsonPath('announcement.id', $announcement['id']);
        $payload['title'] = 'Updated service update';
        $payload['body'] = 'The workspace update is complete.';
        $this->putJson('/api/admin/announcements/'.$announcement['id'], $payload)->assertOk();

        $this->assertDatabaseCount('user_notifications', 2);
        $memberNotice->refresh();
        $this->assertSame($payload['title'], $memberNotice->title);
        $this->assertSame($payload['body'], $memberNotice->message);
        $this->assertNotNull($memberNotice->read_at);
        $this->assertSame($initialPublicationTime, $memberNotice->metadata['published_at']);

        $payload['status'] = 'draft';
        $this->putJson('/api/admin/announcements/'.$announcement['id'], $payload)->assertOk();
        Sanctum::actingAs($member);
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(0, 'notifications.data');
        $this->travel(1)->second();
        Sanctum::actingAs($admin);
        $payload['status'] = 'published';
        $this->putJson('/api/admin/announcements/'.$announcement['id'], $payload)->assertOk();
        $this->assertDatabaseCount('user_notifications', 2);
        $memberNotice->refresh();
        $this->assertNotSame($initialPublicationTime, $memberNotice->metadata['published_at']);
        $this->assertNotNull($memberNotice->read_at);
        $this->travelBack();
    }

    public function test_drafts_are_not_delivered_and_unpublished_content_is_hidden_then_removed_on_delete(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create();
        Sanctum::actingAs($admin);
        $payload = ['title' => 'Draft notice', 'body' => 'Draft details', 'status' => 'draft'];
        $announcement = $this->postJson('/api/admin/announcements', $payload)->assertCreated()->json('announcement');
        $this->assertDatabaseCount('user_notifications', 0);

        $payload['status'] = 'published';
        $this->putJson('/api/admin/announcements/'.$announcement['id'], $payload)->assertOk();
        $this->assertDatabaseCount('user_notifications', 2);

        $payload['status'] = 'draft';
        $this->putJson('/api/admin/announcements/'.$announcement['id'], $payload)->assertOk();
        Sanctum::actingAs($member);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonCount(0, 'notifications.data')
            ->assertJsonPath('unread_count', 0);

        Sanctum::actingAs($admin);
        $this->deleteJson('/api/admin/announcements/'.$announcement['id'])->assertOk();
        $this->assertDatabaseCount('user_notifications', 0);
    }

    public function test_new_users_receive_only_announcements_that_are_currently_active(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $announcement = Announcement::create([
            'created_by' => $admin->id,
            'title' => 'Current notice',
            'body' => 'Current details',
            'status' => 'published',
            'starts_at' => now()->subMinute(),
            'expires_at' => now()->addHour(),
        ]);
        $expired = Announcement::create([
            'created_by' => $admin->id,
            'title' => 'Expired notice',
            'body' => 'Expired details',
            'status' => 'published',
            'expires_at' => now()->subMinute(),
        ]);
        $member = User::factory()->create();

        Sanctum::actingAs($member);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonCount(1, 'notifications.data')
            ->assertJsonPath('notifications.data.0.title', 'Current notice')
            ->assertJsonPath('notifications.data.0.message', 'Current details');
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(1, 'notifications.data');

        $this->assertDatabaseHas('user_notifications', ['user_id' => $member->id, 'dedupe_key' => 'announcement:'.$announcement->id.':'.$member->id]);
        $this->assertDatabaseMissing('user_notifications', ['user_id' => $member->id, 'dedupe_key' => 'announcement:'.$expired->id.':'.$member->id]);
        $this->assertSame(1, UserNotification::count()); // The member receives this directly-created notice on their next bell refresh.
    }

    public function test_scheduled_announcement_is_delivered_when_its_start_time_arrives_without_duplicates(): void
    {
        $this->travelTo(now()->startOfMinute());
        $admin = User::factory()->create(['role' => 'admin']);
        $member = User::factory()->create();
        Sanctum::actingAs($admin);
        $payload = [
            'title' => 'Scheduled notice',
            'body' => 'Available at the scheduled time.',
            'status' => 'published',
            'starts_at' => now()->addMinutes(5)->toIso8601String(),
        ];
        $announcement = $this->postJson('/api/admin/announcements', $payload)->assertCreated()->json('announcement');
        $this->assertDatabaseCount('user_notifications', 0);

        $this->travel(5)->minutes();
        Sanctum::actingAs($member);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonCount(1, 'notifications.data')
            ->assertJsonPath('notifications.data.0.title', 'Scheduled notice');
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(1, 'notifications.data');
        $this->assertDatabaseCount('user_notifications', 1); // The member receives the scheduled notice at their next bell refresh.
        $this->assertDatabaseHas('user_notifications', ['dedupe_key' => 'announcement:'.$announcement['id'].':'.$member->id]);
        $scheduledNotification = UserNotification::where('user_id', $member->id)->firstOrFail();
        $this->assertNotEmpty($scheduledNotification->metadata['published_at']);
        $this->travelBack();
    }
}

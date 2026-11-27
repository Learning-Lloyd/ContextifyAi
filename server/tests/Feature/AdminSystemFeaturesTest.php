<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\SystemSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminSystemFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_are_admin_only_persisted_audited_and_control_registration(): void
    {
        $ordinary = User::factory()->create();
        Sanctum::actingAs($ordinary);
        $this->getJson('/api/admin/settings')->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->putJson('/api/admin/settings/registration_enabled', ['value' => false])->assertOk()
            ->assertJsonPath('setting.value', false);
        $this->getJson('/api/admin/settings')->assertOk()
            ->assertJsonPath('settings.0.value', false);
        $this->assertDatabaseHas('system_settings', ['key' => 'registration_enabled', 'value' => '0']);
        $this->assertDatabaseHas('audit_logs', ['user_id' => $admin->id, 'action' => 'admin_system_setting_updated']);

        $before = User::count();
        $this->postJson('/api/register', ['name' => 'New Member', 'email' => 'new-member@example.test', 'password' => 'password123', 'password_confirmation' => 'password123'])
            ->assertForbidden();
        $this->assertSame($before, User::count());

        $this->putJson('/api/admin/settings/priority_weights', ['value' => [1, 2, 3, 4]])->assertNotFound();
        $this->putJson('/api/admin/settings/registration_enabled', ['value' => 'not-a-boolean'])->assertUnprocessable();
        $this->getJson('/api/admin/settings')->assertJsonPath('settings.0.value', false);
    }

    public function test_announcements_are_validated_published_visible_and_draft_removal_is_controlled(): void
    {
        Carbon::setTestNow('2026-11-26 10:00:00');
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);

        $announcementPayload = [
            'title' => 'Workspace maintenance', 'body' => 'A short planned update.', 'status' => 'published',
            'request_key' => 'admin-announcement-request-1',
            'starts_at' => '2026-11-26T09:00:00Z', 'expires_at' => '2026-11-27T09:00:00Z',
        ];
        $published = $this->postJson('/api/admin/announcements', $announcementPayload)->assertCreated()->json('announcement');
        $this->postJson('/api/admin/announcements', $announcementPayload)->assertOk()
            ->assertJsonPath('announcement.id', $published['id']);
        $this->assertDatabaseCount('announcements', 1);
        $draft = Announcement::create(['created_by' => $admin->id, 'title' => 'Draft', 'body' => 'Not visible', 'status' => 'draft']);
        Announcement::create(['created_by' => $admin->id, 'title' => 'Expired', 'body' => 'Old', 'status' => 'published', 'expires_at' => now()->subMinute()]);
        Announcement::create(['created_by' => $admin->id, 'title' => 'Future', 'body' => 'Later', 'status' => 'published', 'starts_at' => now()->addMinute()]);

        $this->deleteJson('/api/admin/announcements/'.$published['id'])->assertUnprocessable();
        $this->deleteJson('/api/admin/announcements/'.$draft->id)->assertOk();

        $announcementPayload['status'] = 'draft';
        $this->putJson('/api/admin/announcements/'.$published['id'], $announcementPayload)->assertOk();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/notifications')->assertOk()->assertJsonCount(0, 'notifications.data');

        Sanctum::actingAs($admin);
        $announcementPayload['status'] = 'published';
        $this->putJson('/api/admin/announcements/'.$published['id'], $announcementPayload)->assertOk();

        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonCount(1, 'notifications.data')
            ->assertJsonPath('notifications.data.0.title', 'Workspace maintenance')
            ->assertJsonPath('notifications.data.0.message', 'A short planned update.');
        $this->assertSame(404, $this->getJson('/api/announcements')->status());
        $this->postJson('/api/admin/announcements', [])->assertForbidden();
        Carbon::setTestNow();
    }

    public function test_health_endpoint_reports_only_safe_live_check_results(): void
    {
        $this->getJson('/api/admin/health')->assertUnauthorized();
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/health')->assertOk()
            ->assertJsonPath('application.status', 'operational')
            ->assertJsonPath('api.status', 'operational')
            ->assertJsonPath('database.status', 'reachable')
            ->assertJsonPath('providers.weather.status', 'not_checked')
            ->assertJsonPath('scheduler.last_execution', 'not_tracked')
            ->assertJsonMissingPath('providers.gemini.api_key');
    }
}

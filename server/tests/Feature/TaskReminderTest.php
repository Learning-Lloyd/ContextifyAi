<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_reminder_command_is_registered_every_fifteen_minutes(): void
    {
        $event = collect(app(Schedule::class)->events())
            ->first(fn ($event) => str_contains((string) $event->command, 'contextify:generate-task-reminders'));

        $this->assertNotNull($event);
        $this->assertSame('*/15 * * * *', $event->expression);
        $this->assertTrue($event->withoutOverlapping);
    }

    public function test_reminder_command_creates_one_in_app_notice_and_user_can_read_it(): void
    {
        config(['app.timezone' => 'Asia/Manila']);
        $this->travelTo(Carbon::parse('2026-11-26 08:00:00', 'Asia/Manila'));
        $user = User::factory()->create([
            'task_reminders_enabled' => true,
            'overdue_reminders_enabled' => true,
            'deadline_reminder_minutes' => 60,
        ]);
        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Reminder test task',
            'status' => 'pending',
            'due_date' => '2026-11-26',
            'due_time' => '08:30',
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ]);

        $this->assertSame(0, Artisan::call('contextify:generate-task-reminders'));
        $this->assertSame(0, Artisan::call('contextify:generate-task-reminders'));
        $this->assertDatabaseCount('user_notifications', 1);
        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'task_id' => $task->id,
            'type' => 'deadline_approaching',
            'dedupe_key' => 'deadline:'.$task->id.':'.Carbon::parse('2026-11-26 08:30:00', 'Asia/Manila')->timestamp,
        ]);

        Sanctum::actingAs($user);
        $this->getJson('/api/notifications')->assertOk()
            ->assertJsonPath('unread_count', 1)
            ->assertJsonPath('notifications.data.0.title', 'Deadline approaching');

        $notification = UserNotification::firstOrFail();
        $this->patchJson('/api/notifications/'.$notification->id.'/read')->assertOk();
        $this->getJson('/api/notifications')->assertOk()->assertJsonPath('unread_count', 0);
        $this->travelBack();
    }

    public function test_notification_read_access_is_limited_to_its_owner(): void
    {
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $notification = UserNotification::create([
            'user_id' => $owner->id,
            'type' => 'deadline_approaching',
            'title' => 'Reminder',
            'message' => 'A task is due soon.',
            'dedupe_key' => 'reminder-owner-check',
        ]);

        Sanctum::actingAs($otherUser);
        $this->patchJson('/api/notifications/'.$notification->id.'/read')->assertNotFound();
        $this->assertNull($notification->fresh()->read_at);
    }
}

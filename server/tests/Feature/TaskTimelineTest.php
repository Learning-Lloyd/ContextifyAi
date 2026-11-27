<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskTimelineTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_can_be_scheduled_without_changing_its_official_score_inputs(): void
    {
        config(['ai.enabled' => false]);
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Client-Timezone', 'America/Los_Angeles')->postJson('/api/tasks', [
            'title' => 'Timeline fixture', 'due_date' => '2026-12-01',
            'scheduled_start_date' => '2026-11-27', 'scheduled_start_time' => '09:30',
            'estimated_time_minutes' => 90,
        ])->assertCreated()->assertJsonPath('task.scheduled_start_date', '2026-11-27')
            ->assertJsonPath('task.scheduled_start_time', '09:30');

        $task = Task::findOrFail($response->json('task.id'));
        $this->assertSame($user->id, $task->user_id);
        $this->assertSame(90, $task->estimated_time_minutes);
        $expected = round(($task->importance * .4) + ($task->urgency * .3) + ($task->time_availability * .2) + ($task->current_workload * .1), 1);
        $this->assertSame($expected, (float) $task->priority_score);

        $this->getJson('/api/tasks')->assertOk()->assertJsonPath('tasks.0.scheduled_start_date', '2026-11-27');

        $this->putJson('/api/tasks/'.$task->id, [
            'title' => 'Timeline fixture edited',
            'scheduled_start_date' => '2026-11-27',
            'scheduled_start_time' => '16:45',
        ])->assertOk()->assertJsonPath('task.scheduled_start_date', '2026-11-27')
            ->assertJsonPath('task.scheduled_start_time', '16:45');

        $this->patchJson('/api/tasks/'.$task->id.'/toggle-complete', [])->assertOk();
        $this->assertSame('completed', $task->fresh()->status);
        $this->assertSame('2026-11-27', $task->fresh()->scheduled_start_date?->format('Y-m-d'));
        $this->assertSame('16:45', $task->fresh()->scheduled_start_time);
    }

    public function test_start_time_requires_a_start_date_and_another_users_task_is_not_exposed(): void
    {
        config(['ai.enabled' => false]);
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $task = Task::create(['user_id' => $owner->id, 'title' => 'Private timeline task', 'due_date' => '2026-12-01', 'importance' => 5, 'urgency' => 5, 'time_availability' => 5, 'current_workload' => 5]);

        Sanctum::actingAs($owner);
        $this->putJson('/api/tasks/'.$task->id, ['scheduled_start_time' => '09:00'])->assertUnprocessable();
        Sanctum::actingAs($other);
        $this->getJson('/api/tasks/'.$task->id)->assertForbidden();
        $this->assertNull($task->fresh()->scheduled_start_date);
    }
}

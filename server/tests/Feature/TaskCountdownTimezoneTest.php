<?php

namespace Tests\Feature;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskCountdownTimezoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_api_countdown_uses_the_clients_timezone(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-20 10:00:00', 'UTC'));
        try {
            $user = User::factory()->create();
            Sanctum::actingAs($user);
            $task = $user->tasks()->create([
                'title' => 'Deadline today',
                'importance' => 5,
                'urgency' => 5,
                'urgency_manual' => true,
                'time_availability' => 5,
                'current_workload' => 5,
                'due_date' => '2026-11-20',
                'due_time' => '20:00',
            ]);

            $response = $this->getJson('/api/tasks', ['X-Client-Timezone' => 'Asia/Manila'])->assertOk();
            $taskData = collect($response->json('tasks'))->firstWhere('id', $task->id);

            $this->assertSame('Due in 2 hours', $taskData['countdown']);
        } finally {
            Carbon::setTestNow();
        }
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Task;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskScoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_store_accepts_valid_user_importance_but_ignores_other_client_scoring_factors(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tasks', [
            'title' => 'Study for Final Exam',
            'description' => 'I need to prepare for my final exam next week. I still have several chapters to review.',
            'due_date' => now()->addDays(7)->format('Y-m-d'),
            'importance' => 1,
            'urgency' => 1,
            'time_availability' => 1,
            'current_workload' => 1,
        ]);

        $response->assertCreated();
        $task = $response->json('task');

        $this->assertSame(1, $task['importance']);
        $this->assertSame('user', $task['importance_source']);
        $this->assertNotSame(1, $task['urgency']);
        $this->assertNotSame(1, $task['time_availability']);
        $this->assertNotSame(1, $task['current_workload']);
        $this->assertFalse($task['urgency_manual']);
        $this->assertArrayNotHasKey('priority_score', $task);
        $this->assertGreaterThan(0, Task::where('user_id', $user->id)->firstOrFail()->priority_score);
    }

    public function test_scoring_preview_endpoint_returns_automatic_factors(): void
    {
        Http::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/tasks/scoring-preview', [
            'title' => 'Clean my room',
            'description' => 'Organize my room when I have free time.',
            'due_date' => now()->addDays(14)->format('Y-m-d'),
        ]);

        $response->assertOk();
        $preview = $response->json('preview');

        $this->assertArrayHasKey('importance', $preview);
        $this->assertArrayHasKey('urgency', $preview);
        $this->assertArrayHasKey('time_availability', $preview);
        $this->assertArrayHasKey('current_workload', $preview);
        $this->assertArrayNotHasKey('priority_score', $preview);
        $this->assertArrayHasKey('importance_analysis', $preview);
        $this->assertArrayHasKey('calendar_context', $preview);
        $this->assertGreaterThanOrEqual(1, $preview['importance']);
        $this->assertLessThanOrEqual(10, $preview['importance']);
        $this->assertSame('heuristic', $preview['importance_analysis']['source']);
        Http::assertNothingSent();
    }

    public function test_user_provided_importance_is_preserved_and_remains_user_owned_on_later_edits(): void
    {
        Http::fake();
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $created = $this->postJson('/api/tasks', [
            'title' => 'Prepare final capstone defense',
            'due_date' => now()->addDays(3)->format('Y-m-d'),
            'importance' => 2,
        ])->assertCreated();

        $taskId = $created->json('task.id');
        $created->assertJsonPath('task.importance', 2)
            ->assertJsonPath('task.importance_source', 'user');

        $this->putJson('/api/tasks/'.$taskId, [
            'title' => 'Prepare final capstone defense slides',
            'due_date' => now()->addDays(3)->format('Y-m-d'),
        ])->assertOk()
            ->assertJsonPath('task.importance', 2)
            ->assertJsonPath('task.importance_source', 'user');

        $this->assertSame(2, Task::findOrFail($taskId)->importance);
        Http::assertNothingSent();
    }

    public function test_invalid_user_importance_is_rejected_by_the_backend(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        foreach ([0, 11, null, 5.5] as $importance) {
            $response = $this->postJson('/api/tasks', [
                'title' => 'Study for exam',
                'due_date' => now()->addDay()->format('Y-m-d'),
                'importance' => $importance,
            ]);
            $response->assertUnprocessable()->assertJsonValidationErrors('importance');
        }

        $this->assertDatabaseCount('tasks', 0);
    }
}

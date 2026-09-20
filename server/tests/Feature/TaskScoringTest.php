<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskScoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_task_store_ignores_client_scoring_factors(): void
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

        $this->assertNotSame(1, $task['importance']);
        $this->assertNotSame(1, $task['urgency']);
        $this->assertNotSame(1, $task['time_availability']);
        $this->assertNotSame(1, $task['current_workload']);
        $this->assertFalse($task['urgency_manual']);
        $this->assertGreaterThan(0, $task['priority_score']);
    }

    public function test_scoring_preview_endpoint_returns_automatic_factors(): void
    {
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
        $this->assertArrayHasKey('priority_score', $preview);
        $this->assertArrayHasKey('importance_analysis', $preview);
        $this->assertArrayHasKey('calendar_context', $preview);
        $this->assertGreaterThanOrEqual(1, $preview['importance']);
        $this->assertLessThanOrEqual(10, $preview['importance']);
    }
}

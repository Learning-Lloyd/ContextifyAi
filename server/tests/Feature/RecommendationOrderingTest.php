<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecommendationOrderingTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_and_queue_share_score_then_deadline_order_and_ignore_completed_work(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $later = $user->tasks()->create([
            'title' => 'Same score, later deadline',
            'importance' => 8, 'urgency' => 8, 'time_availability' => 8, 'current_workload' => 8,
            'urgency_manual' => true, 'due_date' => now()->addDays(4)->toDateString(),
        ]);
        $noDeadline = $user->tasks()->create([
            'title' => 'Same score, no deadline',
            'importance' => 8, 'urgency' => 8, 'time_availability' => 8, 'current_workload' => 8,
            'urgency_manual' => true,
        ]);
        $earlier = $user->tasks()->create([
            'title' => 'Same score, earlier deadline',
            'importance' => 8, 'urgency' => 8, 'time_availability' => 8, 'current_workload' => 8,
            'urgency_manual' => true, 'due_date' => now()->addDay()->toDateString(),
        ]);
        $completed = $user->tasks()->create([
            'title' => 'Completed highest score',
            'importance' => 10, 'urgency' => 10, 'time_availability' => 10, 'current_workload' => 10,
            'urgency_manual' => true, 'status' => 'completed', 'due_date' => now()->addDay()->toDateString(),
        ]);

        $queue = $this->getJson('/api/tasks')->assertOk();
        $this->assertSame(
            [$earlier->id, $later->id, $noDeadline->id, $completed->id],
            array_column($queue->json('tasks'), 'id')
        );

        $dashboard = $this->getJson('/api/dashboard')->assertOk();
        $this->assertSame($earlier->id, $dashboard->json('highest_priority_task.id'));
        $this->assertSame(
            [$earlier->id, $later->id, $noDeadline->id],
            array_column($dashboard->json('widgets.highest_priority_tasks'), 'id')
        );
    }
}

<?php

namespace Tests\Feature;

use App\Models\DecisionAnalysis;
use App\Models\Task;
use App\Models\User;
use App\Services\PriorityCalculator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WhatIfSimulationTest extends TestCase
{
    use RefreshDatabase;

    public function test_fixed_weights_in_priority_calculator(): void
    {
        $this->assertSame(0.40, PriorityCalculator::WEIGHTS['importance']);
        $this->assertSame(0.30, PriorityCalculator::WEIGHTS['urgency']);
        $this->assertSame(0.20, PriorityCalculator::WEIGHTS['time_availability']);
        $this->assertSame(0.10, PriorityCalculator::WEIGHTS['current_workload']);
    }

    public function test_simulation_calculates_deterministic_score(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Task with Importance=8, Urgency=6, Time=7, Workload=5
        // Expected: (8*0.4) + (6*0.3) + (7*0.2) + (5*0.1) = 3.2 + 1.8 + 1.4 + 0.5 = 6.90
        $response = $this->postJson('/api/decision-lab/simulate', [
            'scenarios' => [
                [
                    'title' => 'Feature Test Task A',
                    'importance' => 8,
                    'urgency' => 6,
                    'time_availability' => 7,
                    'current_workload' => 5,
                ],
            ],
        ]);

        $response->assertOk();
        $response->assertJson(['simulated' => true]);

        $ranked = $response->json('analysis.ranked_tasks');
        $this->assertCount(1, $ranked);
        $this->assertEquals(6.90, $ranked[0]['priority_score']);
    }

    public function test_simulation_ranks_multiple_tasks_correctly(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        // Task A: (10*0.4) + (10*0.3) + (10*0.2) + (10*0.1) = 10.0
        // Task B: (5*0.4) + (5*0.3) + (5*0.2) + (5*0.1) = 5.0
        // Task C: (7*0.4) + (8*0.3) + (6*0.2) + (4*0.1) = 2.8 + 2.4 + 1.2 + 0.4 = 6.8
        $response = $this->postJson('/api/decision-lab/simulate', [
            'scenarios' => [
                ['title' => 'Task B', 'importance' => 5, 'urgency' => 5, 'time_availability' => 5, 'current_workload' => 5],
                ['title' => 'Task A', 'importance' => 10, 'urgency' => 10, 'time_availability' => 10, 'current_workload' => 10],
                ['title' => 'Task C', 'importance' => 7, 'urgency' => 8, 'time_availability' => 6, 'current_workload' => 4],
            ],
        ]);

        $response->assertOk();
        $ranked = $response->json('analysis.ranked_tasks');

        $this->assertCount(3, $ranked);
        $this->assertSame('Task A', $ranked[0]['title']);
        $this->assertEquals(10.0, $ranked[0]['priority_score']);
        $this->assertSame(1, $ranked[0]['rank']);

        $this->assertSame('Task C', $ranked[1]['title']);
        $this->assertEquals(6.80, $ranked[1]['priority_score']);
        $this->assertSame(2, $ranked[1]['rank']);

        $this->assertSame('Task B', $ranked[2]['title']);
        $this->assertEquals(5.0, $ranked[2]['priority_score']);
        $this->assertSame(3, $ranked[2]['rank']);
    }

    public function test_simulation_does_not_modify_actual_database_tasks(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Original Task',
            'importance' => 3,
            'urgency' => 3,
            'time_availability' => 3,
            'current_workload' => 3,
            'priority_score' => 3.0,
        ]);

        // Simulate with modified factors (all 10)
        $response = $this->postJson('/api/decision-lab/simulate', [
            'scenarios' => [
                [
                    'id' => $task->id,
                    'title' => $task->title,
                    'importance' => 10,
                    'urgency' => 10,
                    'time_availability' => 10,
                    'current_workload' => 10,
                ],
            ],
        ]);

        $response->assertOk();
        $ranked = $response->json('analysis.ranked_tasks');
        $this->assertEquals(10.0, $ranked[0]['priority_score']);

        // Verify task in DB is UNCHANGED
        $task->refresh();
        $this->assertSame(3, $task->importance);
        $this->assertSame(3, $task->urgency);
        $this->assertSame(3, $task->time_availability);
        $this->assertSame(3, $task->current_workload);
        $this->assertEquals(3.0, $task->priority_score);
    }

    public function test_save_simulation_scenario_persists_without_modifying_tasks(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Important Project',
            'importance' => 4,
            'urgency' => 4,
            'time_availability' => 4,
            'current_workload' => 4,
        ]);

        $response = $this->postJson('/api/decision-lab/save-simulation', [
            'title' => 'High Stress Scenario',
            'scenarios' => [
                [
                    'id' => $task->id,
                    'title' => $task->title,
                    'importance' => 9,
                    'urgency' => 9,
                    'time_availability' => 2,
                    'current_workload' => 8,
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('decision_analyses', [
            'user_id' => $user->id,
        ]);

        // Verify scenario title was stored in summary
        $saved = DecisionAnalysis::latest()->first();
        $this->assertSame('High Stress Scenario', $saved->summary['scenario_title']);
        $this->assertSame('what_if_scenario', $saved->summary['type']);

        // Verify original task is still untouched in DB
        $task->refresh();
        $this->assertSame(4, $task->importance);
        $this->assertSame(4, $task->urgency);
    }
}

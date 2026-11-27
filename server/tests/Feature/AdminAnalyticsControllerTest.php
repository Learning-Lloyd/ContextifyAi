<?php

namespace Tests\Feature;

use App\Models\DecisionAnalysis;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Http::preventStrayRequests();
    }

    public function test_analytics_requires_admin_authorization(): void
    {
        $this->getJson('/api/admin/analytics')->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => 'user']));
        $this->getJson('/api/admin/analytics')->assertForbidden();
    }

    public function test_monthly_task_user_and_decision_counts_are_grouped_for_requested_year(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $owner = User::factory()->create();
        $previousYearUser = User::factory()->create();
        $this->setCreatedAt($admin, '2026-01-01 00:00:00');
        $this->setCreatedAt($owner, '2026-12-31 23:59:59');
        $this->setCreatedAt($previousYearUser, '2025-12-31 23:59:59');

        $this->createTask($owner, '2026-01-01 00:00:00', 'completed');
        $this->createTask($owner, '2026-12-31 23:59:59', 'pending');
        $this->createTask($owner, '2025-12-31 23:59:59', 'pending');
        $this->createDecision($owner, '2026-01-31 23:59:59');
        $this->createDecision($owner, '2026-12-31 23:59:59');
        $this->createDecision($owner, '2025-12-31 23:59:59');

        Sanctum::actingAs($admin);
        $response = $this->getJson('/api/admin/analytics?year=2026')->assertOk();

        $this->assertSame([
            ['month' => 1, 'count' => 1],
            ['month' => 12, 'count' => 1],
        ], $response->json('tasks_per_month'));
        $this->assertSame([
            ['month' => 1, 'count' => 1],
            ['month' => 12, 'count' => 1],
        ], $response->json('users_registered'));
        $this->assertSame([
            ['month' => 1, 'count' => 1],
            ['month' => 12, 'count' => 1],
        ], $response->json('decision_frequency'));
        $this->assertSame([
            ['status' => 'completed', 'count' => 1],
            ['status' => 'pending', 'count' => 2],
        ], $response->json('completed_vs_pending'));
        $this->assertSame(3, $response->json('priority_distribution.0.count')
            + $response->json('priority_distribution.1.count')
            + $response->json('priority_distribution.2.count'));
    }

    public function test_admin_dashboard_remains_available_without_external_network_access(): void
    {
        Http::fake(['*' => Http::response(['results' => []], 200)]);
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));

        $this->getJson('/api/admin/dashboard')->assertOk();
    }

    private function setCreatedAt(User $user, string $timestamp): void
    {
        $user->forceFill(['created_at' => Carbon::parse($timestamp, 'UTC')])->saveQuietly();
    }

    private function createTask(User $user, string $timestamp, string $status): Task
    {
        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Analytics fixture',
            'status' => $status,
            'importance' => 6,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 4,
        ]);
        $task->forceFill(['created_at' => Carbon::parse($timestamp, 'UTC')])->saveQuietly();

        return $task;
    }

    private function createDecision(User $user, string $timestamp): void
    {
        $decision = DecisionAnalysis::create([
            'user_id' => $user->id,
            'task_ids' => [],
            'ranked_tasks' => [],
            'summary' => [],
            'recommendation' => [],
            'conflicts' => [],
            'total_selected' => 0,
        ]);
        $decision->forceFill(['created_at' => Carbon::parse($timestamp, 'UTC')])->saveQuietly();
    }
}

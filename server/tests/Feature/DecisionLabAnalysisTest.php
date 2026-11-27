<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DecisionLabAnalysisTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['ai.enabled' => false]);
        Http::preventStrayRequests();
    }

    public function test_explicit_single_task_analysis_returns_breakdown_and_saves_one_analysis(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $task = $this->makeTask($user, 'Single task', 8, now()->addDays(2)->toDateString());

        $response = $this->postJson('/api/decision-lab/analyze', ['task_ids' => [$task->id]])
            ->assertOk()
            ->assertJsonPath('analysis.ranked_tasks.0.id', $task->id)
            ->assertJsonPath('analysis.ranked_tasks.0.rank', 1);

        $this->assertEquals(8.0, $response->json('analysis.ranked_tasks.0.priority_score'));

        $this->assertArrayHasKey('breakdown', $response->json('analysis.ranked_tasks.0'));
        $this->assertArrayHasKey('importance', $response->json('analysis.ranked_tasks.0.breakdown'));
        $this->assertNotEmpty($response->json('analysis.ranked_tasks.0.explanation'));
        $this->assertDatabaseCount('decision_analyses', 1);
        Http::assertNothingSent();

        $this->getJson('/api/decision-lab/timeline')->assertOk()
            ->assertJsonPath('timeline.0.top_task', 'Single task');
        $this->getJson('/api/decision-lab/analyses')->assertOk()
            ->assertJsonPath('data.0.total_selected', 1);
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/decision-lab/timeline')->assertOk()->assertJsonCount(0, 'timeline');
        $this->getJson('/api/decision-lab/analyses')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_explicit_multi_task_analysis_compares_scores_and_saves_one_analysis(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $sameDay = now()->addDays(3)->toDateString();
        $lower = $this->makeTask($user, 'Lower priority', 5, $sameDay);
        $higher = $this->makeTask($user, 'Higher priority', 9, $sameDay);

        $response = $this->postJson('/api/decision-lab/analyze', ['task_ids' => [$lower->id, $higher->id]])
            ->assertOk()
            ->assertJsonPath('analysis.ranked_tasks.0.id', $higher->id)
            ->assertJsonPath('analysis.ranked_tasks.0.rank', 1)
            ->assertJsonPath('analysis.ranked_tasks.1.id', $lower->id)
            ->assertJsonPath('analysis.ranked_tasks.1.rank', 2)
            ->assertJsonPath('analysis.ranked_tasks.1.rank_confidence.level', 'high')
            ->assertJsonPath('analysis.ranked_tasks.1.rank_confidence.score_gap', 4)
            ->assertJsonPath('analysis.conflicts.0.count', 2)
            ->assertJsonPath('analysis.conflicts.0.execution_order.0', 'Higher priority');

        foreach ($response->json('analysis.ranked_tasks') as $rankedTask) {
            $this->assertArrayHasKey('breakdown', $rankedTask);
            $this->assertNotEmpty($rankedTask['explanation']);
        }

        $this->assertEquals(0.4, $response->json('analysis.ranked_tasks.0.breakdown.importance.weight'));
        $this->assertDatabaseCount('decision_analyses', 1);
        Http::assertNothingSent();
    }

    public function test_same_day_conflicts_and_score_gap_confidence_are_returned_without_external_requests(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $date = now()->addDays(3)->toDateString();
        $this->makeTask($user, 'Higher score', 9, $date);
        $this->makeTask($user, 'Lower score', 5, $date);

        $this->postJson('/api/decision-lab/analyze', ['task_ids' => $user->tasks()->pluck('id')->all()])
            ->assertOk()
            ->assertJsonPath('analysis.conflicts.0.count', 2)
            ->assertJsonPath('analysis.conflicts.0.execution_order.0', 'Higher score')
            ->assertJsonPath('analysis.ranked_tasks.0.rank', 1)
            ->assertJsonPath('analysis.ranked_tasks.1.rank_confidence.level', 'high')
            ->assertJsonPath('analysis.ranked_tasks.1.rank_confidence.score_gap', 4);

        Http::assertNothingSent();
    }

    private function makeTask(User $user, string $title, int $factor, string $dueDate): Task
    {
        return $user->tasks()->create([
            'title' => $title,
            'importance' => $factor,
            'urgency' => $factor,
            'urgency_manual' => true,
            'time_availability' => $factor,
            'current_workload' => $factor,
            'due_date' => $dueDate,
        ]);
    }
}

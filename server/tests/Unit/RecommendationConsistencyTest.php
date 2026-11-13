<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Services\AiExplanationService;
use App\Services\DecisionService;
use App\Services\ExplanationService;
use App\Services\PriorityCalculator;
use Carbon\Carbon;
use Tests\TestCase;

class RecommendationConsistencyTest extends TestCase
{
    private function decisionService(): DecisionService
    {
        $ai = $this->createMock(AiExplanationService::class);
        $ai->method('explainRanking')->willReturn([
            'summary' => 'Synthetic test fixture ranking.',
            'task_explanations' => [],
            'productivity_tips' => [],
            'source' => 'heuristic',
        ]);

        return new DecisionService(new ExplanationService(), $ai);
    }

    private function task(int $id, string $title, array $overrides = []): array
    {
        return array_merge([
            'id' => $id,
            'title' => $title,
            'description' => null,
            'status' => 'pending',
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
            'due_date' => null,
            'due_time' => null,
            'estimated_time_minutes' => null,
        ], $overrides);
    }

    public function test_official_formula_stays_on_a_one_to_ten_scale_and_categories_use_existing_thresholds(): void
    {
        $this->assertSame([
            'importance' => 0.40,
            'urgency' => 0.30,
            'time_availability' => 0.20,
            'current_workload' => 0.10,
        ], PriorityCalculator::WEIGHTS);
        $this->assertSame(1.0, PriorityCalculator::calculate(1, 1, 1, 1));
        $this->assertSame(10.0, PriorityCalculator::calculate(10, 10, 10, 10));

        $this->assertSame('high', (new Task(['priority_score' => 8.0]))->priority_level);
        $this->assertSame('medium', (new Task(['priority_score' => 5.0]))->priority_level);
        $this->assertSame('low', (new Task(['priority_score' => 4.99]))->priority_level);
    }

    public function test_high_importance_task_due_tomorrow_ranks_above_low_importance_task_due_next_week(): void
    {
        $result = $this->decisionService()->prioritizeMultiple([
            $this->task(2, 'Low importance next week', [
                'importance' => 3, 'urgency' => 4, 'time_availability' => 6, 'current_workload' => 4,
                'due_date' => now()->addDays(7)->toDateString(),
            ]),
            $this->task(1, 'Important assignment tomorrow', [
                'importance' => 10, 'urgency' => 8, 'time_availability' => 7, 'current_workload' => 5,
                'due_date' => now()->addDay()->toDateString(),
            ]),
        ]);

        $this->assertSame('Important assignment tomorrow', $result['ranked_tasks'][0]['title']);
        $this->assertSame(8.3, $result['ranked_tasks'][0]['priority_score']);
        $this->assertSame('high', $result['ranked_tasks'][0]['priority_level']);
        $this->assertSame('Low importance next week', $result['ranked_tasks'][1]['title']);
        $this->assertSame('low', $result['ranked_tasks'][1]['priority_level']);
    }

    public function test_urgent_overdue_task_keeps_its_deadline_and_importance_reasons(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-13 12:00:00'));
        try {
            $result = $this->decisionService()->prioritizeMultiple([
                $this->task(3, 'Overdue important assignment', [
                    'importance' => 9, 'urgency' => 10, 'time_availability' => 4, 'current_workload' => 8,
                    'due_date' => '2026-11-12', 'estimated_time_minutes' => 120,
                ]),
                $this->task(4, 'Low priority future task', [
                    'importance' => 3, 'urgency' => 4, 'time_availability' => 5, 'current_workload' => 4,
                    'due_date' => '2026-11-20',
                ]),
            ]);

            $recommended = $result['ranked_tasks'][0];
            $this->assertSame('Overdue important assignment', $recommended['title']);
            $this->assertSame(10, $recommended['urgency']);
            $this->assertStringContainsString('Overdue by 12 hours', $recommended['task_card_explanation']);
            $this->assertStringContainsString('Importance is 9/10', $recommended['task_card_explanation']);
            $this->assertStringContainsString('120 minutes', $recommended['task_card_explanation']);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_available_time_and_workload_contributions_control_competing_task_order(): void
    {
        $result = $this->decisionService()->prioritizeMultiple([
            $this->task(5, 'Tight schedule task', [
                'importance' => 6, 'urgency' => 6, 'time_availability' => 2, 'current_workload' => 9,
            ]),
            $this->task(6, 'More time available task', [
                'importance' => 6, 'urgency' => 6, 'time_availability' => 8, 'current_workload' => 3,
            ]),
        ]);

        $this->assertSame('More time available task', $result['ranked_tasks'][0]['title']);
        $this->assertSame(6.1, $result['ranked_tasks'][0]['priority_score']);
        $this->assertSame(5.5, $result['ranked_tasks'][1]['priority_score']);
        $this->assertStringContainsString('Available-time factor: 8/10; current-workload factor: 3/10', $result['ranked_tasks'][0]['task_card_explanation']);
    }

    public function test_task_without_a_deadline_is_explained_without_a_fabricated_countdown(): void
    {
        $result = $this->decisionService()->prioritizeMultiple([
            $this->task(7, 'No deadline task', ['importance' => 7, 'urgency' => 5]),
        ]);

        $this->assertNull($result['ranked_tasks'][0]['countdown']);
        $this->assertStringContainsString('No deadline is set.', $result['ranked_tasks'][0]['task_card_explanation']);
        $this->assertStringNotContainsString('Due in', $result['ranked_tasks'][0]['task_card_explanation']);
    }

    public function test_completed_tasks_are_not_returned_as_unfinished_recommendations(): void
    {
        $result = $this->decisionService()->prioritizeMultiple([
            $this->task(8, 'Completed task', ['status' => 'completed', 'importance' => 10, 'urgency' => 10]),
            $this->task(9, 'Pending task', ['importance' => 5, 'urgency' => 5]),
        ]);

        $this->assertCount(1, $result['ranked_tasks']);
        $this->assertSame('Pending task', $result['ranked_tasks'][0]['title']);
    }

    public function test_equal_scores_use_deadline_then_id_as_repeatable_tie_breakers(): void
    {
        $result = $this->decisionService()->prioritizeMultiple([
            $this->task(20, 'Later due equal score', ['due_date' => '2026-11-20']),
            $this->task(12, 'Higher id equal score', ['due_date' => '2026-11-15']),
            $this->task(11, 'Lower id equal score', ['due_date' => '2026-11-15']),
            $this->task(10, 'No deadline equal score'),
        ]);

        $this->assertSame([11, 12, 20, 10], array_column($result['ranked_tasks'], 'id'));
        $this->assertSame([1, 2, 3, 4], array_column($result['ranked_tasks'], 'rank'));
    }

    public function test_long_task_with_a_short_deadline_shows_the_recorded_duration_and_time_remaining(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-13 12:00:00'));
        try {
            $result = $this->decisionService()->prioritizeMultiple([
                $this->task(30, 'Long task due soon', [
                    'importance' => 8, 'urgency' => 10, 'time_availability' => 3, 'current_workload' => 8,
                    'due_date' => '2026-11-13', 'due_time' => '15:00', 'estimated_time_minutes' => 480,
                ]),
            ]);

            $explanation = $result['ranked_tasks'][0]['task_card_explanation'];
            $this->assertStringContainsString('Due in 3 hours', $explanation);
            $this->assertStringContainsString('480 minutes', $explanation);
            $this->assertStringContainsString('Available-time factor: 3/10; current-workload factor: 8/10', $explanation);
        } finally {
            Carbon::setTestNow();
        }
    }
}

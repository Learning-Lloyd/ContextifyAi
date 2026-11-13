<?php

namespace Tests\Unit;

use App\Services\AiClient;
use App\Services\AiExplanationService;
use App\Services\ExplanationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TaskCardExplanationTest extends TestCase
{
    public function test_fallback_explanation_uses_saved_context_and_weighted_factor_contributions(): void
    {
        $explanation = (new ExplanationService())->forTaskCard([
            'breakdown' => [
                'importance' => ['weighted' => 3.2],
                'urgency' => ['weighted' => 2.4],
                'time_availability' => ['weighted' => 1.0],
                'current_workload' => ['weighted' => 0.5],
            ],
        ]);

        $this->assertStringContainsString('This is the top priority in the current analysis.', $explanation);
        $this->assertStringContainsString('Importance is 5/10.', $explanation);
        $this->assertStringContainsString('No deadline is set.', $explanation);
        $this->assertStringContainsString('Available-time factor: 5/10; current-workload factor: 5/10.', $explanation);
        $this->assertStringContainsString('Importance and Deadline urgency contributed most to its score.', $explanation);
    }

    public function test_explanation_uses_its_actual_rank_and_local_deadline_time(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 12:00:00', 'Asia/Manila'));
        try {
            $explanation = (new ExplanationService())->forTaskCard(
                ['title' => 'Science exam', 'due_date' => '2026-11-09', 'due_time' => '12:00'],
                2,
                3,
                'Asia/Manila',
                [['title' => 'Assignment'], ['title' => 'Science exam'], ['title' => 'Reading']]
            );

            $this->assertStringContainsString('second priority, after Assignment', $explanation);
            $this->assertStringContainsString('Due tomorrow', $explanation);
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_date_only_deadline_remains_due_until_the_end_of_local_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 12:00:00', 'Asia/Manila'));
        try {
            $this->assertSame(
                'Due in 12 hours',
                \App\Services\DeadlineUrgencyService::countdownLabel('2026-11-08', null, 'Asia/Manila')
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_deadline_group_uses_the_clients_local_calendar_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-08 16:30:00', 'UTC'));
        try {
            $this->assertSame('overdue', \App\Services\DeadlineUrgencyService::deadlineGroup('2026-11-08', 'Asia/Manila'));
            $this->assertSame('today', \App\Services\DeadlineUrgencyService::deadlineGroup('2026-11-08', 'UTC'));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_deadline_with_a_past_time_today_is_grouped_as_overdue(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-13 16:00:00', 'Asia/Manila'));
        try {
            $this->assertSame(
                'overdue',
                \App\Services\DeadlineUrgencyService::deadlineGroup('2026-11-13', 'Asia/Manila', '15:00')
            );
            $this->assertSame(
                'today',
                \App\Services\DeadlineUrgencyService::deadlineGroup('2026-11-13', 'Asia/Manila', '17:00')
            );
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_ai_explanation_returns_only_task_scoped_explanations(): void
    {
        config([
            'ai.enabled' => true,
            'ai.api_key' => 'test-key',
            'ai.provider' => 'gemini',
            'ai.base_url' => 'https://gemini.test/v1beta',
            'ai.model' => 'test-model',
            'ai.timeout' => 2,
        ]);

        Http::fake([
            'gemini.test/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => json_encode([
                            'summary' => 'The exam ranks first due to its strong factors.',
                            'top_task_explanation' => 'Importance and urgency contribute most.',
                            'task_explanations' => [
                                ['task_ref' => 'task_1', 'explanation' => 'Importance and urgency contribute most.'],
                                ['task_ref' => 'task_999', 'explanation' => 'Unrelated result.'],
                            ],
                            'productivity_tips' => [],
                            'weather_advice' => null,
                        ])]]]]],
            ]),
        ]);

        $result = (new AiExplanationService(new AiClient()))->explainRanking([
            [
                'id' => 12,
                'rank' => 1,
                'title' => 'Exam',
                'description' => 'Study chapters 1–4',
                'priority_score' => 7.1,
                'priority_level' => 'medium',
                'importance' => 8,
                'urgency' => 7,
                'time_availability' => 5,
                'current_workload' => 5,
                'due_date' => '2026-11-10',
                'breakdown' => [
                    'importance' => ['weighted' => 3.2],
                    'urgency' => ['weighted' => 2.1],
                    'time_availability' => ['weighted' => 1.0],
                    'current_workload' => ['weighted' => 0.5],
                ],
            ],
        ]);

        $this->assertSame('Importance and urgency contribute most.', $result['task_explanations'][12]);
        $this->assertArrayNotHasKey(999, $result['task_explanations']);
        Http::assertSent(function ($request) {
            $prompt = $request['contents'][0]['parts'][0]['text'] ?? '';
            return ! str_contains($prompt, '"id": 12')
                && ! str_contains($prompt, 'location')
                && ! str_contains($prompt, 'priority_score')
                && ! str_contains($prompt, 'factor_contributions')
                && ! str_contains($prompt, 'formula')
                && str_contains($prompt, 'main_context');
        });
    }

    public function test_unavailable_ai_uses_plain_guidance_without_score_breakdown(): void
    {
        config(['ai.enabled' => true, 'ai.api_key' => null]);
        $result = (new AiExplanationService(new AiClient()))->explainRanking([[
            'id' => 42,
            'rank' => 1,
            'title' => 'Prepare for exam',
            'priority_score' => 8.4,
            'due_date' => '2026-11-14',
            'breakdown' => ['importance' => ['weighted' => 3.2]],
        ]]);

        $this->assertSame('heuristic', $result['source']);
        $this->assertStringContainsString('deadline is', $result['summary']);
        $this->assertStringNotContainsString('8.4', $result['summary']);
        $this->assertStringNotContainsString('points', $result['top_task_explanation']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use App\Services\SchedulingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SchedulingConstraintsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_schedule_reports_overdue_undated_and_unfittable_tasks_without_mutating_them(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-11-13 10:00:00'));
        $user = User::factory()->create([
            'daily_available_minutes' => 60,
            'workday_start_time' => '09:00:00',
        ]);
        $common = [
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
            'estimated_time_minutes' => 30,
        ];

        $overdue = Task::create(array_merge($common, [
            'user_id' => $user->id,
            'title' => 'Overdue work',
            'due_date' => '2026-11-12',
        ]));
        $undated = Task::create(array_merge($common, [
            'user_id' => $user->id,
            'title' => 'Deadline missing',
            'due_date' => null,
        ]));
        $cannotFit = Task::create(array_merge($common, [
            'user_id' => $user->id,
            'title' => 'Long task tomorrow',
            'due_date' => '2026-11-14',
            'estimated_time_minutes' => 120,
        ]));
        $missingDuration = Task::create(array_merge($common, [
            'user_id' => $user->id,
            'title' => 'Duration not set',
            'due_date' => '2026-11-15',
            'estimated_time_minutes' => null,
        ]));

        $result = app(SchedulingService::class)->suggest($user, '2026-11-13');
        $issues = collect($result['unplanned_tasks'])->keyBy('id');

        $this->assertSame('overdue', $issues[$overdue->id]['issue_type']);
        $this->assertSame('no_deadline', $issues[$undated->id]['issue_type']);
        $this->assertSame('cannot_fit', $issues[$cannotFit->id]['issue_type']);
        $this->assertSame('missing_duration', $issues[$missingDuration->id]['issue_type']);
        $this->assertSame('pending', $overdue->fresh()->status);
        $this->assertSame('pending', $undated->fresh()->status);
        $this->assertSame('pending', $cannotFit->fresh()->status);
        $this->assertSame('pending', $missingDuration->fresh()->status);
        $this->assertStringContainsString('do not check actual calendar appointments', $result['note']);
    }
}

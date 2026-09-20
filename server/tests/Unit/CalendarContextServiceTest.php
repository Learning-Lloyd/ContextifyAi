<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Models\User;
use App\Services\CalendarContextService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarContextServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_default_when_no_calendar_events(): void
    {
        $user = User::factory()->create();
        $service = app(CalendarContextService::class);

        $result = $service->analyze($user);

        $this->assertSame(5, $result['time_availability']);
        $this->assertSame(5, $result['current_workload']);
        $this->assertSame('default', $result['source']);
    }

    public function test_time_availability_and_workload_use_different_logic(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 4) as $dayOffset) {
            Task::query()->create([
                'user_id' => $user->id,
                'title' => "Commitment {$dayOffset}",
                'due_date' => now()->addDays($dayOffset)->format('Y-m-d'),
                'importance' => 8,
                'urgency' => 8,
                'estimated_time_minutes' => 240,
                'status' => 'pending',
            ]);
        }

        $service = app(CalendarContextService::class);
        $result = $service->analyze($user);

        $this->assertGreaterThanOrEqual(1, $result['time_availability']);
        $this->assertLessThanOrEqual(10, $result['time_availability']);
        $this->assertGreaterThanOrEqual(1, $result['current_workload']);
        $this->assertLessThanOrEqual(10, $result['current_workload']);
        $this->assertSame('calendar', $result['source']);
        $this->assertNotEmpty($result['reason_time_availability']);
        $this->assertNotEmpty($result['reason_current_workload']);
    }
}

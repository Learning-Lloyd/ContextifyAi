<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use App\Services\ReportTimestampFormatter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_report_timestamps_use_the_requested_timezone(): void
    {
        $timestamp = Carbon::parse('2026-11-24 22:30:00', 'UTC');

        $this->assertSame(
            'Nov 25, 2026 06:30',
            ReportTimestampFormatter::format($timestamp, 'Asia/Manila')
        );
        $this->assertSame('2026-11-24 22:30:00', $timestamp->format('Y-m-d H:i:s'));
    }

    public function test_report_requires_authentication(): void
    {
        $this->getJson('/api/user/report/summary?start_date=2026-11-01&end_date=2026-11-30')
            ->assertUnauthorized();
    }

    public function test_report_is_scoped_to_authenticated_user_and_counts_completion(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($user);
        $this->createTask(['user_id' => $user->id, 'status' => 'completed', 'created_at' => '2026-11-30 23:59:59', 'category' => 'Academic']);
        $this->createTask(['user_id' => $user->id, 'status' => 'pending', 'created_at' => '2026-11-01 00:00:00', 'category' => 'Work']);
        $this->createTask(['user_id' => $other->id, 'status' => 'completed', 'created_at' => '2026-11-15 12:00:00']);

        $this->getJson('/api/user/report/summary?start_date=2026-11-01&end_date=2026-11-30&status=all')
            ->assertOk()
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.completed', 1)
            ->assertJsonPath('summary.pending', 1)
            ->assertJsonPath('summary.completion_rate', 50)
            ->assertJsonPath('status_distribution.0.status', 'completed')
            ->assertJsonPath('status_distribution.0.count', 1)
            ->assertJsonPath('status_distribution.0.percentage', 50)
            ->assertJsonPath('status_distribution.1.status', 'pending');
    }

    public function test_report_includes_both_date_boundaries_and_applies_status_filter(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->createTask(['user_id' => $user->id, 'status' => 'completed', 'created_at' => '2026-10-31 16:00:00']);
        $this->createTask(['user_id' => $user->id, 'status' => 'completed', 'created_at' => '2026-11-30 15:59:59']);
        $this->createTask(['user_id' => $user->id, 'status' => 'pending', 'created_at' => '2026-11-15 12:00:00']);
        $this->createTask(['user_id' => $user->id, 'status' => 'pending', 'created_at' => '2026-12-01 00:00:00']);

        $this->withHeader('X-Client-Timezone', 'Asia/Manila')
            ->getJson('/api/user/report/summary?start_date=2026-11-01&end_date=2026-11-30&status=completed')
            ->assertOk()
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.completed', 2)
            ->assertJsonPath('summary.pending', 0)
            ->assertJsonPath('summary.completion_rate', 100)
            ->assertJsonPath('status_distribution.0.count', 2)
            ->assertJsonPath('status_distribution.0.percentage', 100)
            ->assertJsonPath('status_distribution.1.count', 0);
    }

    public function test_empty_report_has_zero_completion_and_empty_series(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/user/report/summary?start_date=2026-11-01&end_date=2026-11-30')
            ->assertOk()
            ->assertJsonPath('summary.total', 0)
            ->assertJsonPath('summary.completion_rate', 0)
            ->assertJsonPath('status_distribution.0.count', 0)
            ->assertJsonPath('status_distribution.1.count', 0)
            ->assertJsonPath('activity', [])
            ->assertJsonPath('by_category', []);
    }

    public function test_pdf_accepts_custom_dates_and_status_filter(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->createTask(['user_id' => $user->id, 'status' => 'completed', 'created_at' => '2026-11-15 12:00:00']);

        if (! class_exists(\Dompdf\Dompdf::class)) {
            $this->markTestSkipped('PDF generation dependency is not installed.');
        }

        $response = $this->withHeader('X-Client-Timezone', 'Asia/Manila')
            ->get('/api/user/report?start_date=2026-11-01&end_date=2026-11-30&status=completed')
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('/Subtype /Image', $response->getContent(), 'PDF embeds the official logo as a raster image.');
    }
    private function createTask(array $attributes): Task
    {
        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);
        $task = Task::create(array_merge([
            'title' => 'Report verification task',
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ], $attributes));

        if ($createdAt) {
            $task->forceFill(['created_at' => Carbon::parse($createdAt)])->saveQuietly();
        }

        return $task;
    }
}

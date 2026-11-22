<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use App\Services\ReportExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminReportAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_analytics_requires_authentication_and_admin_permission(): void
    {
        $query = '?start_date=2026-11-01&end_date=2026-11-30';
        $this->getJson('/api/admin/reports/summary'.$query)->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create(['role' => 'user']));
        $this->getJson('/api/admin/reports/summary'.$query)->assertForbidden();
    }

    public function test_admin_summary_uses_filtered_platform_data_and_real_active_user_field(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $taskOwner = User::factory()->create(['is_active' => true]);
        User::factory()->create(['is_active' => false]);
        Sanctum::actingAs($admin);

        $this->createTask(['user_id' => $taskOwner->id, 'status' => 'completed', 'category' => 'Academic', 'created_at' => '2026-10-31 16:00:00']);
        $this->createTask(['user_id' => $taskOwner->id, 'status' => 'pending', 'category' => 'Work', 'created_at' => '2026-11-30 15:59:59']);
        $this->createTask(['user_id' => $taskOwner->id, 'status' => 'completed', 'category' => 'Outside range', 'created_at' => '2026-12-01 00:00:00']);

        $this->withHeader('X-Client-Timezone', 'Asia/Manila')
            ->getJson('/api/admin/reports/summary?period=monthly&start_date=2026-11-01&end_date=2026-11-30&status=all')
            ->assertOk()
            ->assertJsonPath('summary.users_total', 3)
            ->assertJsonPath('summary.users_active', 2)
            ->assertJsonPath('summary.total', 2)
            ->assertJsonPath('summary.completed', 1)
            ->assertJsonPath('summary.pending', 1)
            ->assertJsonPath('summary.completion_rate', 50)
            ->assertJsonPath('status_distribution.0.percentage', 50)
            ->assertJsonPath('filters.period', 'monthly')
            ->assertJsonPath('by_category.0.count', 1);
    }

    public function test_admin_summary_applies_status_filter_and_empty_reports_have_zero_rate(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createTask(['status' => 'completed', 'created_at' => '2026-11-10 12:00:00']);
        $this->createTask(['status' => 'pending', 'created_at' => '2026-11-11 12:00:00']);

        $this->getJson('/api/admin/reports/summary?start_date=2026-11-01&end_date=2026-11-30&status=completed')
            ->assertOk()
            ->assertJsonPath('summary.total', 1)
            ->assertJsonPath('summary.completed', 1)
            ->assertJsonPath('summary.pending', 0)
            ->assertJsonPath('summary.completion_rate', 100);

        $this->getJson('/api/admin/reports/summary?start_date=2026-10-01&end_date=2026-10-31')
            ->assertOk()
            ->assertJsonPath('summary.total', 0)
            ->assertJsonPath('summary.completion_rate', 0)
            ->assertJsonPath('by_category', []);
    }

    public function test_admin_analytics_pdf_embeds_official_logo_and_generated_charts(): void
    {
        if (! class_exists(\Dompdf\Dompdf::class)) {
            $this->markTestSkipped('PDF generation dependency is not installed.');
        }

        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->createTask(['status' => 'completed', 'category' => 'Academic', 'created_at' => '2026-11-15 12:00:00']);
        $this->createTask(['status' => 'pending', 'category' => 'Personal', 'created_at' => '2026-11-16 12:00:00']);
        $query = 'period=monthly&start_date=2026-11-01&end_date=2026-11-30&status=all';
        $summary = $this->getJson('/api/admin/reports/summary?'.$query)->assertOk()->json();

        $html = app(ReportExportService::class)->buildAdminAnalyticsHtml($summary, $summary['filters']);
        $this->assertStringContainsString('data:image/jpeg;base64,', $html);
        $this->assertStringContainsString('data:image/svg+xml;base64,', $html);
        preg_match('/data:image\\/svg\\+xml;base64,([^"]+)/', $html, $chartMatch);
        $this->assertNotEmpty($chartMatch[1] ?? null);
        $this->assertStringContainsString('<svg', base64_decode($chartMatch[1]));
        $this->assertStringContainsString('50%', $html);
        $this->assertStringNotContainsString('@example.com', $html);

        $response = $this->get('/api/admin/reports/export?type=analytics&format=pdf&'.$query)
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->assertStringContainsString('/Subtype /Image', $response->getContent(), 'The PDF should embed the Contextify PNG logo.');
    }

    public function test_non_pdf_admin_analytics_export_is_rejected(): void
    {
        Sanctum::actingAs(User::factory()->create(['role' => 'admin']));
        $this->getJson('/api/admin/reports/export?type=analytics&format=csv&start_date=2026-11-01&end_date=2026-11-30')
            ->assertUnprocessable();
    }

    private function createTask(array $attributes): Task
    {
        $userId = $attributes['user_id'] ?? User::factory()->create()->id;
        $createdAt = $attributes['created_at'] ?? null;
        unset($attributes['created_at']);

        $task = Task::create(array_merge([
            'title' => 'Admin report fixture',
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ], $attributes, ['user_id' => $userId]));

        if ($createdAt) {
            $task->forceFill(['created_at' => Carbon::parse($createdAt)])->saveQuietly();
        }

        return $task;
    }
}

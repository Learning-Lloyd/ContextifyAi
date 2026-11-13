<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResearchDatasetTest extends TestCase
{
    use RefreshDatabase;

    public function test_ms_latte_research_records_remain_available_separately_from_personal_tasks(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->getJson('/api/research-dataset/records?source=ms_latte&per_page=5')
            ->assertOk()
            ->assertJsonPath('source', 'ms_latte')
            ->assertJsonPath('pagination.total', 10101)
            ->assertJsonCount(5, 'records')
            ->assertJsonStructure(['records' => [['source_id', 'title', 'location_labels', 'time_labels']]])
            ->assertJsonPath('datasets.0.key', 'contextify_scoring_validation')
            ->assertJsonPath('datasets.1.key', 'ms_latte')
            ->assertJsonMissingPath('records.0.priority_score');
    }
}

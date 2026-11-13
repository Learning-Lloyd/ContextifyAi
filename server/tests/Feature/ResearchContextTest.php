<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ResearchContextTest extends TestCase
{
    use RefreshDatabase;

    public function test_research_context_predictions_are_authenticated_and_separate_from_priority(): void
    {
        $this->postJson('/api/research-context/predict', [
            'tasks' => [['id' => 7, 'title' => 'Buy groceries']],
        ])->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson('/api/research-context/predict', [
            'tasks' => [['id' => 7, 'title' => 'Buy groceries']],
        ])->assertOk()
            ->assertJsonPath('model.dataset', 'MS-LaTTE human annotation research model')
            ->assertJsonPath('model.target', 'likely_location')
            ->assertJsonPath('model.model_version', '1.0.4')
            ->assertJsonPath('predictions.0.task_id', 7)
            ->assertJsonStructure(['model' => ['dataset_sha256', 'training_records', 'test_records', 'trained_at']])
            ->assertJsonStructure(['notice', 'predictions' => [['likely_locations']]])
            ->assertJsonMissingPath('predictions.0.priority_score');
    }

}

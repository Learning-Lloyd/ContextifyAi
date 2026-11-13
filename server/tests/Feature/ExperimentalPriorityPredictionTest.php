<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExperimentalPriorityPredictionTest extends TestCase
{
    use RefreshDatabase;

    public function test_experimental_predictions_are_separate_from_formula_scores_and_scoped_to_owner(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();
        Sanctum::actingAs($user);

        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Prepare project presentation',
            'description' => 'Draft the presentation slides.',
            'category' => 'Academic',
            'due_date' => now()->addDays(2)->format('Y-m-d'),
            'estimated_time_minutes' => 90,
            'importance' => 8,
            'urgency' => 8,
            'time_availability' => 6,
            'current_workload' => 7,
            'status' => 'pending',
        ]);
        $originalScore = $task->priority_score;
        $foreignTask = Task::create([
            'user_id' => $otherUser->id,
            'title' => 'Private task',
            'due_date' => now()->addDay()->format('Y-m-d'),
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ]);

        config(['services.contextify_priority_model.url' => 'http://127.0.0.1:8010/predict-priority']);
        Http::fake([
            'http://127.0.0.1:8010/predict-priority' => Http::response([
                'predictions' => [[
                    'task_id' => $task->id,
                    'title' => $task->title,
                    'priority_category' => 'High',
                    'prediction_type' => 'experimental_synthetic_data',
                ]],
                'model' => [
                    'name' => 'contextify_task_priority_classifier',
                    'version' => '1.0.0',
                    'provenance' => 'SYNTHETIC / AI-GENERATED SAMPLE DATA',
                ],
            ], 200),
        ]);

        $this->postJson('/api/decision-lab/predict-experimental-priority', [
            'task_ids' => [$task->id],
        ])->assertOk()
            ->assertJsonPath('predictions.0.priority_category', 'High')
            ->assertJsonPath('predictions.0.prediction_type', 'experimental_synthetic_data')
            ->assertJsonPath('predictions.0.importance_source', 'legacy')
            ->assertJsonPath('predictions.0.review_required', true)
            ->assertJsonPath('predictions.0.unverified_input_sources.0', 'time availability')
            ->assertJsonPath('model.provenance', 'SYNTHETIC / AI-GENERATED SAMPLE DATA')
            ->assertJsonMissingPath('predictions.0.confidence')
            ->assertJsonMissingPath('predictions.0.priority_score');

        $task->refresh();
        $this->assertSame((float) $originalScore, (float) $task->priority_score);
        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8010/predict-priority'
            && $request['assignments'][0]['task_id'] === $task->id);

        $this->postJson('/api/decision-lab/predict-experimental-priority', [
            'task_ids' => [$foreignTask->id],
        ])->assertForbidden();
    }

    public function test_model_service_unavailability_returns_a_clear_503(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Read chapter',
            'due_date' => now()->addDay()->format('Y-m-d'),
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ]);
        Http::fake(['http://127.0.0.1:8010/predict-priority' => Http::response([], 503)]);

        $this->postJson('/api/decision-lab/predict-experimental-priority', [
            'task_ids' => [$task->id],
        ])->assertStatus(503)
            ->assertJsonPath('message', 'The experimental model could not produce predictions right now.');
    }

    public function test_task_with_invalid_factor_is_not_sent_to_the_experimental_model_or_given_a_prediction(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $task = Task::create([
            'user_id' => $user->id,
            'title' => 'Check invalid legacy factor',
            'due_date' => now()->addDay()->format('Y-m-d'),
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
            'current_workload' => 5,
        ]);
        \Illuminate\Support\Facades\DB::table('tasks')->where('id', $task->id)->update(['importance' => 11]);
        Http::fake();

        $this->postJson('/api/decision-lab/predict-experimental-priority', [
            'task_ids' => [$task->id],
        ])->assertOk()
            ->assertJsonPath('predictions.0.prediction_status', 'insufficient_inputs')
            ->assertJsonPath('predictions.0.priority_category', null)
            ->assertJsonPath('predictions.0.missing_inputs.0', 'importance');

        Http::assertNothingSent();
    }
}

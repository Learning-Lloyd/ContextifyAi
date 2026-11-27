<?php

namespace Tests\Feature;

use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TaskBreakdownTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        Http::preventStrayRequests(false);
        parent::tearDown();
    }

    public function test_reviewed_steps_save_as_owned_scored_tasks_without_using_the_ai_rate_limit(): void
    {
        config([
            'ai.enabled' => false,
            'ai.rate_limits.user_per_minute' => 1,
            'ai.rate_limits.global_per_minute' => 1,
        ]);
        $user = User::factory()->create();
        $parent = $this->makeParentTask($user);
        Sanctum::actingAs($user);

        $firstPayload = [
            'request_id' => 'e397ad91-a203-4909-b834-88d3c759411b',
            'steps' => [
                ['title' => 'Review the draft', 'description' => 'Check the outline.'],
                ['title' => 'Prepare the final slides', 'description' => ''],
            ],
        ];
        $first = $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", $firstPayload)
            ->assertCreated()
            ->assertJsonPath('message', 'Reviewed steps added successfully.')
            ->assertJsonCount(2, 'tasks')
            ->assertJsonPath('tasks.0.title', 'Review the draft')
            ->assertJsonPath('tasks.0.due_time', '09:20')
            ->assertJsonPath('tasks.0.estimated_time_minutes', null)
            ->assertJsonPath('tasks.0.status', 'pending');

        $created = $first->json('tasks');
        $this->assertNotEmpty($created[0]['priority_score']);
        $this->assertContains($created[0]['priority_level'], ['high', 'medium', 'low']);
        $this->assertSame(3, Task::query()->where('user_id', $user->id)->count());
        $firstSavedTask = Task::findOrFail($created[0]['id']);
        $this->assertDatabaseHas('tasks', [
            'id' => $created[0]['id'],
            'user_id' => $user->id,
            'category' => 'Academic',
            'description' => 'Check the outline.',
        ]);
        $this->assertSame($parent->due_date->format('Y-m-d'), $firstSavedTask->due_date->format('Y-m-d'));
        $this->assertDatabaseHas('tasks', [
            'id' => $created[1]['id'],
            'description' => null,
        ]);

        // The ordinary reviewed-step endpoint did not consume either AI limiter.
        $this->postJson('/api/tasks/generate-description', ['title' => 'Write a short description'])
            ->assertStatus(503);
        $this->postJson('/api/tasks/generate-description', ['title' => 'Write another description'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'AI requests are temporarily limited. Please wait a minute and try again.');
        Http::assertNothingSent();
    }

    public function test_retrying_the_same_reviewed_step_request_returns_existing_tasks_without_duplicates(): void
    {
        config(['ai.enabled' => false]);
        $user = User::factory()->create();
        $parent = $this->makeParentTask($user);
        Sanctum::actingAs($user);
        $payload = [
            'request_id' => '140e90d7-975f-40fb-b65b-f0bfc4cd2bf4',
            'steps' => [['title' => 'Prepare a presentation', 'description' => 'Review the outline.']],
        ];

        $first = $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", $payload)
            ->assertCreated();
        $taskId = $first->json('tasks.0.id');
        $retry = $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", $payload)
            ->assertOk()
            ->assertJsonPath('message', 'Reviewed steps added successfully.')
            ->assertJsonPath('tasks.0.id', $taskId);

        $this->assertSame(2, Task::query()->where('user_id', $user->id)->count());
        $this->assertSame(1, Task::query()->where('user_id', $user->id)->where('title', 'Prepare a presentation')->count());
        $this->assertNotNull($retry->json('tasks.0.rank'));
        Http::assertNothingSent();
    }

    public function test_reusing_an_idempotency_key_for_different_reviewed_content_is_rejected(): void
    {
        config(['ai.enabled' => false]);
        $user = User::factory()->create();
        $parent = $this->makeParentTask($user);
        Sanctum::actingAs($user);
        $requestId = '6be98e14-bfa9-494f-9f43-979f4f620a5a';

        $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", [
            'request_id' => $requestId,
            'steps' => [['title' => 'First reviewed title']],
        ])->assertCreated();

        $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", [
            'request_id' => $requestId,
            'steps' => [['title' => 'Changed reviewed title']],
        ])->assertConflict();

        $this->assertSame(2, Task::query()->where('user_id', $user->id)->count());
        Http::assertNothingSent();
    }

    public function test_reviewed_step_saving_requires_authentication_and_parent_ownership(): void
    {
        $owner = User::factory()->create();
        $parent = $this->makeParentTask($owner);
        $payload = [
            'request_id' => '13ca8f26-41bc-4842-9c70-3f51a7ef2f19',
            'steps' => [['title' => 'Review the task']],
        ];

        $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", $payload)->assertUnauthorized();

        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", $payload)->assertNotFound();
        $this->assertSame(1, Task::query()->count());
        Http::assertNothingSent();
    }

    public function test_invalid_reviewed_step_batch_creates_no_partial_tasks(): void
    {
        config(['ai.enabled' => false]);
        $user = User::factory()->create();
        $parent = $this->makeParentTask($user);
        Sanctum::actingAs($user);

        $this->postJson("/api/tasks/{$parent->id}/breakdown-steps", [
            'request_id' => '18de55b3-76da-4f0f-a253-6cf37dce01d2',
            'steps' => [
                ['title' => 'Valid first step'],
                ['title' => ''],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('steps.1.title');

        $this->assertSame(1, Task::query()->where('user_id', $user->id)->count());
        Http::assertNothingSent();
    }

    public function test_ai_step_generation_remains_on_the_ai_limited_route(): void
    {
        config([
            'ai.enabled' => true,
            'ai.provider' => 'gemini',
            'ai.api_key' => 'test-only-key',
            'ai.base_url' => 'https://gemini.test/v1beta',
            'ai.model' => 'test-model',
            'ai.retry_attempts' => 1,
            'ai.rate_limits.user_per_minute' => 1,
            'ai.rate_limits.global_per_minute' => 5,
        ]);
        Http::fake([
            '*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [['text' => json_encode([
                        'subtasks' => [['title' => 'Review the outline', 'description' => 'Read the notes.']],
                    ])]]],
                ]],
            ], 200),
        ]);

        $user = User::factory()->create();
        $parent = $this->makeParentTask($user);
        Sanctum::actingAs($user);

        $this->postJson('/api/tasks/breakdown', ['task_id' => $parent->id])
            ->assertOk()
            ->assertJsonPath('subtasks.0.title', 'Review the outline');
        $this->postJson('/api/tasks/breakdown', ['task_id' => $parent->id])
            ->assertStatus(429)
            ->assertJsonPath('message', 'AI requests are temporarily limited. Please wait a minute and try again.');

        Http::assertSentCount(1);
    }

    private function makeParentTask(User $user): Task
    {
        return $user->tasks()->create([
            'title' => 'Complete the capstone project',
            'description' => 'Create and review the project presentation.',
            'category' => 'Academic',
            'due_date' => now()->addDays(3)->toDateString(),
            'due_time' => '09:20:00',
            'importance' => 7,
            'urgency' => 6,
            'urgency_manual' => true,
            'time_availability' => 5,
            'current_workload' => 4,
            'status' => 'pending',
        ]);
    }
}

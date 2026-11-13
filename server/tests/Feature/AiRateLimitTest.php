<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AiRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();

        // Fail closed if a future change unexpectedly attempts a provider request.
        config(['ai.enabled' => false]);
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        Http::preventStrayRequests(false);

        parent::tearDown();
    }

    public function test_ai_routes_limit_requests_per_authenticated_user_without_calling_gemini(): void
    {
        config([
            'ai.rate_limits.user_per_minute' => 2,
            'ai.rate_limits.global_per_minute' => 10,
        ]);
        Sanctum::actingAs(User::factory()->create());

        $payload = ['title' => 'Prepare project notes'];

        $this->postJson('/api/tasks/generate-description', $payload)->assertStatus(503);
        $this->postJson('/api/tasks/generate-description', $payload)->assertStatus(503);
        $this->postJson('/api/tasks/generate-description', $payload)
            ->assertStatus(429)
            ->assertJsonPath('message', 'AI requests are temporarily limited. Please wait a minute and try again.');
    }

    public function test_global_ai_limit_is_shared_across_users_and_ai_routes(): void
    {
        config([
            'ai.rate_limits.user_per_minute' => 10,
            'ai.rate_limits.global_per_minute' => 2,
        ]);
        $firstUser = User::factory()->create();
        $secondUser = User::factory()->create();
        $thirdUser = User::factory()->create();

        Sanctum::actingAs($firstUser);
        $this->postJson('/api/tasks/generate-description', ['title' => 'First task'])
            ->assertStatus(503);

        Sanctum::actingAs($secondUser);
        $this->postJson('/api/tasks/analyze-importance', ['title' => 'Second task'])
            ->assertOk();

        Sanctum::actingAs($thirdUser);
        $this->postJson('/api/tasks/generate-description', ['title' => 'Third task'])
            ->assertStatus(429);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Goal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GoalTest extends TestCase
{
    use RefreshDatabase;

    public function test_goals_are_private_and_progress_is_returned(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        Goal::create(['user_id' => $owner->id, 'title' => 'Weekly focus', 'target_count' => 3, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString()]);
        Goal::create(['user_id' => $other->id, 'title' => 'Private goal', 'target_count' => 4, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString()]);

        Sanctum::actingAs($owner);
        $response = $this->getJson('/api/goals')->assertOk();
        $response->assertJsonCount(1, 'goals')->assertJsonPath('goals.0.title', 'Weekly focus')->assertJsonPath('goals.0.progress', 0);
        $this->putJson('/api/goals/2', ['title' => 'Changed', 'target_count' => 1, 'starts_on' => now()->toDateString(), 'ends_on' => now()->addWeek()->toDateString()])->assertNotFound();
    }
}

<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspacePreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_save_and_retrieve_onboarding_preferences(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $preferences = [
            'focus' => ['Education', 'Projects and Tasks'],
            'categories' => ['Academic', 'Work'],
        ];

        $this->putJson('/api/user/profile', [
            'workspace_preferences' => $preferences,
            'onboarding_completed' => true,
        ])->assertOk()
            ->assertJsonPath('user.workspace_preferences.focus.0', 'Education')
            ->assertJsonPath('user.workspace_preferences.focus.1', 'Projects and Tasks')
            ->assertJsonPath('user.workspace_preferences.categories.0', 'Academic')
            ->assertJsonPath('user.workspace_preferences.categories.1', 'Work')
            ->assertJsonStructure(['user' => ['onboarding_completed_at']]);

        $this->getJson('/api/user')->assertOk()
            ->assertJsonPath('user.workspace_preferences', $preferences)
            ->assertJsonStructure(['user' => ['onboarding_completed_at']]);

        $this->assertSame($preferences, $user->fresh()->workspace_preferences);
    }

    public function test_workspace_preferences_still_require_authentication(): void
    {
        $this->putJson('/api/user/profile', [
            'workspace_preferences' => ['focus' => ['Work'], 'categories' => ['Work']],
        ])->assertUnauthorized();
    }

    public function test_invalid_workspace_preferences_are_rejected_without_saving(): void
    {
        $user = User::factory()->create(['workspace_preferences' => ['focus' => ['Work'], 'categories' => ['Work']]]);
        Sanctum::actingAs($user);

        $this->putJson('/api/user/profile', [
            'workspace_preferences' => ['focus' => ['Unrecognized area'], 'categories' => ['Unrecognized category']],
        ])->assertUnprocessable();

        $this->assertSame(['focus' => ['Work'], 'categories' => ['Work']], $user->fresh()->workspace_preferences);
    }
}

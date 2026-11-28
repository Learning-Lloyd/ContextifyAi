<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\TransientToken;
use Tests\TestCase;

class SanctumLogoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_logout_revokes_only_the_current_personal_access_token(): void
    {
        $user = User::factory()->create();
        $current = $user->createToken('current-device');
        $unrelated = $user->createToken('other-device');

        $this->withToken($current->plainTextToken)->postJson('/api/logout')->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $current->accessToken->id]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $unrelated->accessToken->id]);

        Auth::forgetGuards();
        $this->withToken($current->plainTextToken)->getJson('/api/user')->assertUnauthorized();

        Auth::forgetGuards();
        $this->withToken($unrelated->plainTextToken)->getJson('/api/user')->assertOk();
    }

    public function test_logout_does_not_call_delete_on_a_sanctum_transient_token(): void
    {
        $user = User::factory()->create();
        $user->withAccessToken(new TransientToken());
        Auth::guard('sanctum')->setUser($user);
        Auth::shouldUse('sanctum');

        $this->assertInstanceOf(TransientToken::class, $user->currentAccessToken());
        $this->postJson('/api/logout')->assertOk()->assertJsonPath('message', 'Logged out successfully');
    }

    public function test_logout_invalidates_the_matching_stateful_web_session(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'web')->withSession(['logout-marker' => 'present']);

        $this->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost',
        ])->postJson('/api/logout')->assertOk();

        $this->assertGuest('web');
        $this->assertFalse(session()->has('logout-marker'));
    }

    public function test_verified_user_can_login_and_logout_without_revoking_other_tokens(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $login = $this->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost',
        ])->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $token = $login->json('token');
        $this->assertIsString($token);
        [$currentTokenId] = explode('|', $token, 2);
        // Login intentionally replaces prior tokens in this application. Add
        // the unrelated token afterwards to verify logout is scoped correctly.
        $otherToken = $user->fresh()->createToken('another-session');
        Auth::forgetGuards();
        $this->withToken($token)->withHeaders([
            'Origin' => 'http://localhost',
            'Referer' => 'http://localhost',
        ])->postJson('/api/logout')->assertOk();
        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $currentTokenId]);
        $this->assertDatabaseHas('personal_access_tokens', ['id' => $otherToken->accessToken->id]);

        $this->assertGuest('web');
        Auth::forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }
}

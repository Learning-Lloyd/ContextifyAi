<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AuthWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_signs_user_in_without_email_verification(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertCreated()
            ->assertJsonPath('message', 'Registration successful. You are now signed in.')
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);

        $user = User::where('email', 'new@example.com')->firstOrFail();
        $this->assertNull($user->email_verified_at);
        $this->assertDatabaseHas('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_existing_unverified_user_can_sign_in(): void
    {
        $user = User::factory()->unverified()->create(['password' => 'password123']);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonPath('message', 'Login successful')
            ->assertJsonStructure(['token']);
    }

    public function test_password_reset_link_is_sent_and_valid_token_resets_password(): void
    {
        Notification::fake();
        $user = User::factory()->create(['password' => 'old-password']);

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
        Notification::assertSentTo($user, ResetPassword::class);
        $token = app('auth.password.broker')->createToken($user);

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ])->assertOk();

        $this->assertTrue(password_verify('new-password-123', $user->fresh()->password));
        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'another-password',
            'password_confirmation' => 'another-password',
        ])->assertUnprocessable();
    }
}

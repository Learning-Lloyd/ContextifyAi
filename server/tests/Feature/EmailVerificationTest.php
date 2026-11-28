<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use App\Services\AuthMailDeliveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use RuntimeException;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_signup_must_verify_before_login_or_using_protected_api(): void
    {
        [$user, $code, $response] = $this->createPendingUser();

        $response->assertCreated()->assertJsonMissingPath('token')->assertJsonMissingPath('code');
        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertUnprocessable();

        $token = $user->createToken('verification-gate-test')->plainTextToken;
        $this->withToken($token)->getJson('/api/user')->assertForbidden();

        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $code])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('email_verification_challenges', ['user_id' => $user->id]);

        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $code])->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_verification_code_is_sent_and_only_a_hmac_digest_is_stored(): void
    {
        [$user, $code] = $this->createPendingUser();

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertDatabaseHas('email_verification_challenges', [
            'user_id' => $user->id,
            'failed_attempts' => 0,
        ]);
        $this->assertDatabaseMissing('email_verification_challenges', ['code_hash' => $code]);
        Notification::assertSentTo($user, EmailVerificationCodeNotification::class);
    }

    public function test_wrong_code_is_rejected_and_five_failures_invalidate_it(): void
    {
        [$user, $code] = $this->createPendingUser();

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => '000000'])
                ->assertUnprocessable();
        }

        $this->assertDatabaseMissing('email_verification_challenges', ['user_id' => $user->id]);
        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $code])
            ->assertTooManyRequests();
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_expired_code_is_rejected(): void
    {
        [$user, $code] = $this->createPendingUser();
        $this->travel(11)->minutes();

        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $code])
            ->assertUnprocessable();

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertDatabaseMissing('email_verification_challenges', ['user_id' => $user->id]);
    }

    public function test_resending_after_cooldown_replaces_old_code_and_resend_is_generic(): void
    {
        [$user, $oldCode] = $this->createPendingUser();
        $this->travel(61)->seconds();

        $this->postJson('/api/resend-verification-code', ['email' => $user->email])
            ->assertStatus(202)
            ->assertJsonPath('message', 'If the account needs verification, a new code will be sent when available.');

        $sent = Notification::sent($user, EmailVerificationCodeNotification::class);
        $this->assertCount(2, $sent);
        $newCode = $sent->last()->code;
        $this->assertNotSame($oldCode, $newCode);

        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $oldCode])
            ->assertUnprocessable();
        $this->postJson('/api/verify-email', ['email' => $user->email, 'code' => $newCode])
            ->assertOk();
    }

    public function test_resend_cooldown_and_unknown_address_response_are_non_enumerating(): void
    {
        [$user] = $this->createPendingUser();

        $existing = $this->postJson('/api/resend-verification-code', ['email' => $user->email]);
        $missing = $this->postJson('/api/resend-verification-code', ['email' => 'unknown@example.test']);

        $existing->assertStatus(202);
        $missing->assertStatus(202);
        $this->assertSame($existing->json(), $missing->json());
        $this->assertCount(1, Notification::sent($user, EmailVerificationCodeNotification::class));
    }

    public function test_existing_unverified_accounts_remain_eligible_to_sign_in(): void
    {
        $user = User::factory()->unverified()->create(['password' => 'password123']);
        $this->assertNull($user->email_verification_required_at);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['token']);
    }

    public function test_registration_does_not_leave_an_account_when_mail_preflight_fails(): void
    {
        $this->partialMock(AuthMailDeliveryService::class, function ($mock): void {
            $mock->shouldReceive('assertAvailable')->once()->andThrow(new RuntimeException('provider unavailable'));
        });

        $this->postJson('/api/register', [
            'name' => 'Pending User',
            'email' => 'delivery-failure@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(503);

        $this->assertDatabaseMissing('users', ['email' => 'delivery-failure@example.test']);
        $this->assertDatabaseMissing('email_verification_challenges', ['user_id' => 1]);
    }

    private function createPendingUser(): array
    {
        Notification::fake();
        $response = $this->postJson('/api/register', [
            'name' => 'Verification User',
            'email' => 'verification@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $user = User::where('email', 'verification@example.test')->firstOrFail();
        $notification = Notification::sent($user, EmailVerificationCodeNotification::class)->first();

        return [$user, $notification->code, $response];
    }
}

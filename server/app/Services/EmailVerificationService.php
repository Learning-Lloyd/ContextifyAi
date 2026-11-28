<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\EmailVerificationCodeNotification;
use Illuminate\Support\Facades\DB;

class EmailVerificationService
{
    public const CODE_TTL_MINUTES = 10;
    public const MAX_FAILED_ATTEMPTS = 5;
    public const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(private readonly AuthMailDeliveryService $mailDelivery) {}

    public function issue(User $user): void
    {
        $this->mailDelivery->assertAvailable();
        $code = (string) random_int(100000, 999999);
        $now = now();

        DB::table('email_verification_challenges')->updateOrInsert(
            ['user_id' => $user->id],
            [
                'code_hash' => hash_hmac('sha256', $code, (string) config('app.key')),
                'expires_at' => $now->copy()->addMinutes(self::CODE_TTL_MINUTES),
                'failed_attempts' => 0,
                'last_sent_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );

        // Deliberately synchronous: deployment hosts may pause free-tier queue workers.
        $user->notify(new EmailVerificationCodeNotification($code));
    }

    public function resend(User $user): void
    {
        $challenge = DB::table('email_verification_challenges')->where('user_id', $user->id)->first();
        if ($challenge && now()->lt(\Illuminate\Support\Carbon::parse($challenge->last_sent_at)->addSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            return;
        }

        $this->issue($user);
    }

    public function verify(string $email, string $code): bool
    {
        return DB::transaction(function () use ($email, $code): bool {
            $user = User::query()->where('email', $email)->lockForUpdate()->first();
            if (! $user || ! $user->email_verification_required_at || $user->email_verified_at) {
                return false;
            }

            $challenge = DB::table('email_verification_challenges')
                ->where('user_id', $user->id)
                ->lockForUpdate()
                ->first();

            if (! $challenge || now()->greaterThanOrEqualTo($challenge->expires_at)) {
                if ($challenge) {
                    DB::table('email_verification_challenges')->where('user_id', $user->id)->delete();
                }

                return false;
            }

            $submittedHash = hash_hmac('sha256', $code, (string) config('app.key'));
            if (! hash_equals($challenge->code_hash, $submittedHash)) {
                $attempts = ((int) $challenge->failed_attempts) + 1;
                if ($attempts >= self::MAX_FAILED_ATTEMPTS) {
                    DB::table('email_verification_challenges')->where('user_id', $user->id)->delete();
                } else {
                    DB::table('email_verification_challenges')->where('user_id', $user->id)->update([
                        'failed_attempts' => $attempts,
                        'updated_at' => now(),
                    ]);
                }

                return false;
            }

            $user->forceFill(['email_verified_at' => now()])->save();
            DB::table('email_verification_challenges')->where('user_id', $user->id)->delete();

            return true;
        });
    }
}

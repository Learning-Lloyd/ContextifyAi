<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('ai', function (Request $request): array {
            $limitedResponse = static fn (Request $request, array $headers) => response()->json([
                'message' => 'AI requests are temporarily limited. Please wait a minute and try again.',
            ], 429, $headers);

            return [
                Limit::perMinute(max(1, (int) config('ai.rate_limits.user_per_minute', 5)))
                    ->by('user:'.($request->user()?->getAuthIdentifier() ?? $request->ip()))
                    ->response($limitedResponse),
                // Five logical calls/minute leaves headroom for the client's bounded retries.
                Limit::perMinute(max(1, (int) config('ai.rate_limits.global_per_minute', 5)))
                    ->by('global')
                    ->response($limitedResponse),
            ];
        });

        $emailLimits = function (Request $request, int $accountLimit, int $ipLimit): array {
            $email = Str::lower(trim((string) $request->input('email')));
            $digest = hash_hmac('sha256', $email, (string) config('app.key'));

            return [
                Limit::perMinute($accountLimit)->by('auth-email:account:'.$digest),
                Limit::perMinute($ipLimit)->by('auth-email:ip:'.$request->ip()),
            ];
        };

        RateLimiter::for('email-verification', fn (Request $request): array => $emailLimits($request, 5, 20));
        RateLimiter::for('email-verification-resend', fn (Request $request): array => $emailLimits($request, 3, 20));

        ResetPassword::createUrlUsing(function ($user, string $token): string {
            $query = http_build_query(['token' => $token, 'email' => $user->getEmailForPasswordReset()]);

            return rtrim(config('app.frontend_url'), '/') . '/reset-password?' . $query;
        });
    }
}

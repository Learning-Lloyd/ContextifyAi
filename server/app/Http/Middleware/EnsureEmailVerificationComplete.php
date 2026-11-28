<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerificationComplete
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->email_verification_required_at && ! $user->email_verified_at) {
            abort(403, 'Email verification is required before using this account.');
        }

        return $next($request);
    }
}

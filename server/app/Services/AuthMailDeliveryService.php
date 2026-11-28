<?php

namespace App\Services;

use RuntimeException;

class AuthMailDeliveryService
{
    private const SUPPORTED_DELIVERY_MAILERS = ['smtp', 'ses', 'ses-v2', 'postmark', 'resend', 'mailgun'];

    public function assertAvailable(): void
    {
        if (app()->environment('testing')) {
            return;
        }

        $mailer = (string) config('mail.default');
        if (app()->environment('local') && in_array($mailer, ['log', 'array'], true)) {
            return;
        }

        if (! in_array($mailer, self::SUPPORTED_DELIVERY_MAILERS, true)) {
            throw new RuntimeException('A real email delivery transport is not configured.');
        }

        if ($mailer === 'smtp') {
            $smtp = (array) config('mail.mailers.smtp', []);
            $host = strtolower(trim((string) ($smtp['host'] ?? '')));
            $from = strtolower(trim((string) config('mail.from.address')));

            if ($host === '' || (app()->environment('production') && in_array($host, ['localhost', '127.0.0.1', '::1'], true))) {
                throw new RuntimeException('SMTP host is not configured for this environment.');
            }

            if ($from === '' || str_ends_with($from, '.example') || in_array($from, ['hello@example.com', 'noreply@example.com'], true)) {
                throw new RuntimeException('A verified sender address is not configured.');
            }

            if (! empty($smtp['username']) && empty($smtp['password'])) {
                throw new RuntimeException('SMTP authentication credentials are incomplete.');
            }
        }
    }
}

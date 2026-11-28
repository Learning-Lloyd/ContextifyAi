<?php

namespace App\Services;

use RuntimeException;
use Throwable;

class AuthMailDeliveryService
{
    private const SUPPORTED_DELIVERY_MAILERS = ['smtp', 'ses', 'ses-v2', 'postmark', 'resend', 'mailgun'];

    /**
     * Return only safe, structured diagnostics. Never include SMTP credentials,
     * message bodies, raw provider responses, or complete mail URLs in logs.
     */
    public function failureDiagnostics(Throwable $exception): array
    {
        $smtp = (array) config('mail.mailers.smtp', []);
        $mailUrl = trim((string) ($smtp['url'] ?? ''));
        $urlParts = $mailUrl !== '' ? parse_url($mailUrl) : false;
        $host = is_array($urlParts) ? ($urlParts['host'] ?? null) : null;
        $host ??= $smtp['host'] ?? null;
        $scheme = is_array($urlParts) ? ($urlParts['scheme'] ?? null) : null;
        $scheme ??= $smtp['scheme'] ?? null;
        $port = is_array($urlParts)
            ? ($urlParts['port'] ?? (strtolower((string) ($urlParts['scheme'] ?? '')) === 'smtps' ? 465 : 25))
            : ($smtp['port'] ?? null);
        $port = is_numeric($port) && (int) $port >= 1 && (int) $port <= 65535 ? (int) $port : null;
        $username = is_array($urlParts) && array_key_exists('user', $urlParts)
            ? rawurldecode((string) $urlParts['user'])
            : trim((string) ($smtp['username'] ?? ''));
        $password = is_array($urlParts) && array_key_exists('pass', $urlParts)
            ? rawurldecode((string) $urlParts['pass'])
            : (string) ($smtp['password'] ?? '');
        $sender = trim((string) config('mail.from.address', ''));
        $mailer = (string) config('mail.default', '');

        return [
            'failure_category' => $this->failureCategory($exception),
            'exception_class' => $exception::class,
            'previous_exception_class' => $exception->getPrevious() ? $exception->getPrevious()::class : null,
            'mailer' => in_array($mailer, self::SUPPORTED_DELIVERY_MAILERS, true) ? $mailer : 'other',
            'mail_url_override' => $mailUrl !== '',
            'smtp_host' => $this->safeHost($host),
            'smtp_scheme' => in_array(strtolower((string) $scheme), ['smtp', 'smtps'], true) ? strtolower((string) $scheme) : null,
            'smtp_port' => $port,
            'smtp_scheme_port_compatible' => $this->schemePortCompatible($scheme, $port),
            'smtp_username_present' => $username !== '',
            'smtp_password_present' => $password !== '',
            'smtp_credentials_present' => $username !== '' && $password !== '',
            'sender_matches_smtp_username' => $username !== '' && $sender !== ''
                ? strtolower($username) === strtolower($sender)
                : null,
        ];
    }

    private function failureCategory(Throwable $exception): string
    {
        $messages = [];
        for ($current = $exception; $current !== null; $current = $current->getPrevious()) {
            $messages[] = strtolower($current->getMessage());
        }
        $diagnosticText = implode("\n", $messages);

        return match (true) {
            preg_match('/getaddrinfo|name or service not known|temporary failure in name resolution|could not resolve|php_network_getaddresses|nodename nor servname/', $diagnosticText) === 1 => 'dns_failure',
            preg_match('/timed? out|timeout|operation timed out/', $diagnosticText) === 1 => 'connection_timeout',
            preg_match('/connection refused|actively refused/', $diagnosticText) === 1 => 'connection_refused',
            preg_match('/tls|ssl|certificate|handshake|crypto enable/', $diagnosticText) === 1 => 'tls_handshake_failure',
            preg_match('/\b535\b|authentication failed|auth(?:entication)? rejected|invalid login|username and password not accepted|5\.7\.8/', $diagnosticText) === 1 => 'smtp_authentication_rejected',
            preg_match('/sender address rejected|mail from.*reject|sender.*(?:reject|not permitted)|\b553\b/', $diagnosticText) === 1 => 'sender_rejected',
            preg_match('/\b(?:4|5)\d\d\b|smtp.*(?:reject|error)/', $diagnosticText) === 1 => 'smtp_server_rejected',
            default => 'mail_transport_failure',
        };
    }

    private function safeHost(mixed $host): ?string
    {
        if (! is_string($host) || $host === '') {
            return null;
        }

        return preg_match('/\A[a-zA-Z0-9.-]{1,253}\z/', $host) === 1 ? strtolower($host) : 'configured';
    }

    private function schemePortCompatible(mixed $scheme, ?int $port): ?bool
    {
        $scheme = strtolower((string) $scheme);
        if (! in_array($scheme, ['smtp', 'smtps'], true) || $port === null) {
            return null;
        }

        return ! (($scheme === 'smtps' && $port !== 465) || ($scheme === 'smtp' && $port === 465));
    }

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

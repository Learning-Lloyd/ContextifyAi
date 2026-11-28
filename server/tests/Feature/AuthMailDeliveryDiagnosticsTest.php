<?php

namespace Tests\Feature;

use App\Services\AuthMailDeliveryService;
use RuntimeException;
use Tests\TestCase;

class AuthMailDeliveryDiagnosticsTest extends TestCase
{
    public function test_transport_failures_are_mapped_to_safe_categories(): void
    {
        $service = app(AuthMailDeliveryService::class);

        $cases = [
            ['getaddrinfo failed while resolving relay', 'dns_failure'],
            ['Connection timed out', 'connection_timeout'],
            ['Connection refused by relay', 'connection_refused'],
            ['TLS handshake failed', 'tls_handshake_failure'],
            ['535 5.7.8 Username and Password not accepted', 'smtp_authentication_rejected'],
            ['Sender address rejected by server', 'sender_rejected'],
            ['An unclassified transport failure', 'mail_transport_failure'],
        ];

        foreach ($cases as [$message, $expectedCategory]) {
            $diagnostics = $service->failureDiagnostics(new RuntimeException($message));
            $this->assertSame($expectedCategory, $diagnostics['failure_category']);
        }
    }

    public function test_diagnostics_report_effective_mail_configuration_without_secrets(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.url' => null,
            'mail.mailers.smtp.host' => 'smtp.gmail.com',
            'mail.mailers.smtp.scheme' => 'smtps',
            'mail.mailers.smtp.port' => 465,
            'mail.mailers.smtp.username' => 'sender@example.test',
            'mail.mailers.smtp.password' => 'do-not-log-this-test-password',
            'mail.from.address' => 'sender@example.test',
        ]);

        $diagnostics = app(AuthMailDeliveryService::class)->failureDiagnostics(
            new RuntimeException('Connection timed out'),
        );
        $serialized = json_encode($diagnostics, JSON_THROW_ON_ERROR);

        $this->assertSame('connection_timeout', $diagnostics['failure_category']);
        $this->assertSame('smtp', $diagnostics['mailer']);
        $this->assertFalse($diagnostics['mail_url_override']);
        $this->assertSame('smtp.gmail.com', $diagnostics['smtp_host']);
        $this->assertSame('smtps', $diagnostics['smtp_scheme']);
        $this->assertSame(465, $diagnostics['smtp_port']);
        $this->assertTrue($diagnostics['smtp_scheme_port_compatible']);
        $this->assertTrue($diagnostics['smtp_username_present']);
        $this->assertTrue($diagnostics['smtp_password_present']);
        $this->assertTrue($diagnostics['smtp_credentials_present']);
        $this->assertTrue($diagnostics['sender_matches_smtp_username']);
        $this->assertStringNotContainsString('do-not-log-this-test-password', $serialized);
        $this->assertStringNotContainsString('sender@example.test', $serialized);
    }

    public function test_mail_url_override_is_detected_without_logging_url_credentials(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.url' => 'smtps://private-user:private-password@smtp.gmail.com',
            'mail.mailers.smtp.host' => 'ignored.example.test',
            'mail.mailers.smtp.scheme' => 'smtp',
            'mail.mailers.smtp.port' => 587,
            'mail.mailers.smtp.username' => 'private-user',
            'mail.mailers.smtp.password' => 'private-password',
            'mail.from.address' => 'private-user@example.test',
        ]);

        $diagnostics = app(AuthMailDeliveryService::class)->failureDiagnostics(new RuntimeException('SMTP failure'));
        $serialized = json_encode($diagnostics, JSON_THROW_ON_ERROR);

        $this->assertTrue($diagnostics['mail_url_override']);
        $this->assertSame('smtp.gmail.com', $diagnostics['smtp_host']);
        $this->assertSame('smtps', $diagnostics['smtp_scheme']);
        $this->assertSame(465, $diagnostics['smtp_port']);
        $this->assertTrue($diagnostics['smtp_scheme_port_compatible']);
        $this->assertTrue($diagnostics['smtp_username_present']);
        $this->assertTrue($diagnostics['smtp_password_present']);
        $this->assertStringNotContainsString('private-user', $serialized);
        $this->assertStringNotContainsString('private-password', $serialized);
    }
}

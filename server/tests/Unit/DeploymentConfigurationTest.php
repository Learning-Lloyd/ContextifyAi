<?php

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use Illuminate\Http\Request;
use Illuminate\Http\Middleware\TrustProxies;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class DeploymentConfigurationTest extends TestCase
{
    #[DataProvider('databaseUrlAndProxyConfigurationProvider')]
    public function test_deployment_database_url_and_proxy_environment_configuration(
        string $dbUrl,
        string $databaseUrl,
        string $trustedProxies,
        ?string $expectedDatabaseUrl,
        array|string|null $expectedProxies,
    ): void {
        $script = <<<'PHP'
require getcwd().'/vendor/autoload.php';
$app = new Illuminate\Foundation\Application(getcwd());
Illuminate\Container\Container::setInstance($app);
$database = require getcwd().'/config/database.php';
$proxy = require getcwd().'/config/trustedproxy.php';
$expectedProxies = json_decode(getenv('EXPECTED_PROXIES'), true);
$actualProxies = $proxy['proxies'];
$expectedUrl = getenv('EXPECTED_DATABASE_URL');
$urlMatches = $expectedUrl === '__NULL__'
    ? $database['connections']['mysql']['url'] === null
    : $database['connections']['mysql']['url'] === $expectedUrl;
exit($urlMatches && $actualProxies === $expectedProxies ? 0 : 1);
PHP;

        $expectedDatabaseUrlValue = $expectedDatabaseUrl ?? '__NULL__';
        $process = new Process(
            [PHP_BINARY, '-r', $script],
            base_path(),
            [
                'DB_URL' => $dbUrl,
                'DATABASE_URL' => $databaseUrl,
                'TRUSTED_PROXIES' => $trustedProxies,
                'EXPECTED_DATABASE_URL' => $expectedDatabaseUrlValue,
                'EXPECTED_PROXIES' => json_encode($expectedProxies, JSON_THROW_ON_ERROR),
            ],
        );
        $process->run();

        $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
    }

    public function test_trusted_proxy_configuration_recognizes_forwarded_https(): void
    {
        config(['trustedproxy.proxies' => '*']);
        $request = Request::create('http://contextify.test/', 'GET', server: [
            'REMOTE_ADDR' => '10.20.30.40',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);
        $response = app(TrustProxies::class)->handle(
            $request,
            fn (Request $request) => response()->json(['secure' => $request->isSecure()]),
        );

        $this->assertTrue($response->getData(true)['secure']);
    }

    public static function databaseUrlAndProxyConfigurationProvider(): array
    {
        return [
            'DB_URL override wins' => [
                'mysql://override:secret@db.example.test/contextify',
                'mysql://addon:secret@db.example.test/contextify',
                '',
                'mysql://override:secret@db.example.test/contextify',
                null,
            ],
            'blank DB_URL uses injected DATABASE_URL and parses proxy list' => [
                '',
                'mysql://addon:secret@db.example.test/contextify',
                '10.0.0.1, 10.0.0.2',
                'mysql://addon:secret@db.example.test/contextify',
                ['10.0.0.1', '10.0.0.2'],
            ],
            'wildcard remains an explicit string for platform proxy configuration' => [
                '',
                'mysql://addon:secret@db.example.test/contextify',
                '*',
                'mysql://addon:secret@db.example.test/contextify',
                '*',
            ],
            'both database URL values blank leaves an empty URL value' => [
                '',
                '',
                '',
                '',
                null,
            ],
        ];
    }
}

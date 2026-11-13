<?php

namespace Tests\Unit;

use App\Services\AiClient;
use App\Services\TaskDescriptionService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiClientReliabilityTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ai.enabled' => true,
            'ai.provider' => 'gemini',
            'ai.api_key' => 'test-key-do-not-log',
            'ai.base_url' => 'https://gemini.test/v1beta',
            'ai.model' => 'gemini-3.8-flash',
            'ai.timeout' => 2,
            'ai.retry_attempts' => 3,
            'ai.retry_base_delay_ms' => 0,
            'ai.retry_max_delay_ms' => 0,
            'ai.retry_max_wait_seconds' => 5,
        ]);
    }

    public function test_gemini_native_success_shape_and_rate_limit_retry_recovery(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/gemini-3.8-flash:generateContent' => Http::sequence()
                ->push(['error' => ['message' => 'Too many requests']], 429, ['Retry-After' => '0'])
                ->push([
                    'candidates' => [['content' => ['parts' => [['text' => '{"description":"Recovered"}']]]]],
                ]),
        ]);

        $client = app(AiClient::class);
        $this->assertSame(['description' => 'Recovered'], $client->chatJson('system', 'user'));
        $this->assertNull($client->lastFailure());
        Http::assertSentCount(2);
        Http::assertSent(fn ($request) => $request->hasHeader('x-goog-api-key', 'test-key-do-not-log')
            && ! $request->hasHeader('Authorization')
            && $request['generationConfig']['responseMimeType'] === 'application/json');
    }

    public function test_rate_limit_message_tells_the_user_how_long_to_wait_when_supplied(): void
    {
        config(['ai.retry_attempts' => 1]);
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::response(
                ['error' => ['message' => 'Slow down']],
                429,
                ['Retry-After' => '3']
            ),
        ]);

        $service = app(TaskDescriptionService::class);
        $this->assertNull($service->generate('Review notes', null));
        $this->assertStringContainsString('try again in about 3 seconds', $service->unavailableMessage());
        Http::assertSentCount(1);
    }

    public function test_exhausted_rate_limit_preserves_status_body_and_retry_after(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::response(
                ['error' => ['message' => 'Provider is busy', 'type' => 'rate_limit']],
                429,
                ['Retry-After' => '0']
            ),
        ]);

        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $failure = $client->lastFailure();

        $this->assertSame('rate_limit', $failure['category']);
        $this->assertSame(429, $failure['status']);
        $this->assertSame('0', $failure['retry_after']);
        $this->assertStringContainsString('Provider is busy', $failure['body']);
        Http::assertSentCount(3);
    }

    public function test_authentication_and_credit_errors_are_not_retried(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::sequence()
                ->push(['error' => ['message' => 'Unauthorized']], 401)
                ->push(['error' => ['message' => 'Insufficient balance']], 402),
        ]);

        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('authentication', $client->lastFailure()['category']);
        $this->assertSame(401, $client->lastFailure()['status']);
        Http::assertSentCount(1);

        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('insufficient_credits', $client->lastFailure()['category']);
        $this->assertSame(402, $client->lastFailure()['status']);
        Http::assertSentCount(2);
    }

    public function test_provider_failure_is_retried_and_success_is_returned(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::sequence()
                ->push(['error' => ['message' => 'Temporary upstream error']], 503)
                ->push(['candidates' => [['content' => ['parts' => [['text' => '{"description":"Available again"}']]]]]]),
        ]);

        $client = app(AiClient::class);
        $this->assertSame(['description' => 'Available again'], $client->chatJson('system', 'user'));
        Http::assertSentCount(2);
    }

    public function test_network_timeout_is_classified_retried_and_can_recover(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::sequence()
                ->pushFailedConnection('cURL error 28: Operation timed out')
                ->push(['candidates' => [['content' => ['parts' => [['text' => '{"description":"Recovered after timeout"}']]]]]]),
        ]);

        $client = app(AiClient::class);
        $this->assertSame(['description' => 'Recovered after timeout'], $client->chatJson('system', 'user'));
        $this->assertNull($client->lastFailure());
        Http::assertSentCount(2);
    }

    public function test_retry_after_longer_than_request_wait_limit_is_not_retried_early(): void
    {
        Http::fake([
            'https://gemini.test/v1beta/models/*:generateContent' => Http::response(
                ['error' => ['message' => 'Wait before retrying']],
                429,
                ['Retry-After' => '60']
            ),
        ]);

        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('60', $client->lastFailure()['retry_after']);
        Http::assertSentCount(1);
    }

    public function test_gemini_rejects_authentication_without_retry(): void
    {
        Http::fake(['https://gemini.test/*' => Http::response(['error' => ['message' => 'Bad key']], 403)]);
        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('authentication', $client->lastFailure()['category']);
        Http::assertSentCount(1);
    }

    public function test_gemini_malformed_success_response_is_reported_without_retry(): void
    {
        Http::fake(['https://gemini.test/*' => Http::response(['candidates' => []])]);
        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('malformed_response', $client->lastFailure()['category']);
        Http::assertSentCount(1);
    }

    public function test_gemini_invalid_request_is_classified_without_retry(): void
    {
        Http::fake(['https://gemini.test/*' => Http::response(['error' => ['message' => 'Invalid model']], 400)]);
        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('invalid_request', $client->lastFailure()['category']);
        Http::assertSentCount(1);
    }

    public function test_gemini_retry_info_is_respected_without_retrying_before_its_wait(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'error' => [
                    'message' => 'Please retry later.',
                    'details' => [['retryDelay' => '8s']],
                ],
            ], 429),
        ]);
        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('8', $client->lastFailure()['retry_after']);
        $this->assertStringContainsString('about 8 seconds', $client->unavailableMessage());
        Http::assertSentCount(1);
    }

    public function test_gemini_daily_quota_error_displays_a_human_readable_reset_wait(): void
    {
        Http::fake([
            'https://gemini.test/*' => Http::response([
                'error' => [
                    'message' => 'Generate content requests per day limit exceeded. Please retry in 19h35m21s.',
                    'details' => [
                        [
                            '@type' => 'type.googleapis.com/google.rpc.QuotaFailure',
                            'violations' => [[
                                'quotaId' => 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
                                'description' => 'Generate content requests per day limit exceeded on Free Tier.',
                            ]],
                        ],
                        ['@type' => 'type.googleapis.com/google.rpc.RetryInfo', 'retryDelay' => '70521s'],
                    ],
                ],
            ], 429),
        ]);
        $client = app(AiClient::class);
        $this->assertNull($client->chatJson('system', 'user'));
        $this->assertSame('daily', $client->lastFailure()['quota_scope']);
        $message = $client->unavailableMessage();
        $this->assertStringContainsString('daily request quota is exhausted', $message);
        $this->assertStringContainsString('19 hours and 35 minutes', $message);
        $this->assertStringNotContainsString('70521 seconds', $message);
        Http::assertSentCount(1);
    }

    public function test_openrouter_remains_available_when_selected_explicitly(): void
    {
        config([
            'ai.provider' => 'openrouter',
            'ai.base_url' => 'https://openrouter.test/api/v1',
            'ai.model' => 'openrouter/free',
        ]);
        Http::fake([
            'https://openrouter.test/api/v1/chat/completions' => Http::response([
                'choices' => [['message' => ['content' => '{"description":"OpenRouter works"}']]],
            ]),
        ]);
        $client = app(AiClient::class);
        $this->assertSame(['description' => 'OpenRouter works'], $client->chatJson('system', 'user'));
        Http::assertSent(fn ($request) => $request['model'] === 'openrouter/free' && $request->hasHeader('Authorization'));
    }
}

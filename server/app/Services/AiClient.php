<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class AiClient
{
    private ?array $lastFailure = null;

    public function isConfigured(): bool
    {
        return config('ai.enabled') && ! empty(config('ai.api_key'));
    }

    /** @return array<string, mixed>|null */
    public function lastFailure(): ?array
    {
        return $this->lastFailure;
    }

    public function unavailableMessage(string $feature = 'AI help'): string
    {
        $failure = $this->lastFailure ?? [];
        $provider = config('ai.provider') === 'gemini' ? 'Google Gemini' : 'OpenRouter';
        $retryAfter = $failure['retry_after'] ?? null;
        $wait = $this->formatRetryWait($retryAfter);

        return match ($failure['category'] ?? null) {
            'not_configured' => "{$feature} is unavailable because the AI provider key is not configured on the server.",
            'invalid_request' => "{$provider} rejected this request. Check the configured model and request settings.",
            'authentication' => "{$provider} rejected the server API key or its permissions. Check the server configuration.",
            'rate_limit' => ($failure['quota_scope'] ?? null) === 'daily'
                ? "{$provider}'s free-tier daily request quota is exhausted. It should reset in about ".($wait ?? 'a day').". Try again then or review your usage limits; Contextify will not switch providers or enable paid use."
                : (($failure['quota_scope'] ?? null) === 'minute'
                    ? "{$provider} reached its free-tier per-minute request limit. Please try again in ".($wait ?? 'a little while')."."
                    : ($wait
                        ? "{$provider} is temporarily rate-limiting requests. Please try again in about {$wait}."
                        : "{$provider} has reached its current rate or quota limit. Please try again later or review the provider's limits.")),
            'insufficient_credits' => "{$provider} reports insufficient credits for the configured model. Contextify did not switch providers or models.",
            'provider_error' => "{$provider} is temporarily unavailable. Contextify retried a limited number of times; please try again shortly.",
            'network_timeout' => 'The AI provider did not respond in time after limited retries. Please try again shortly.',
            'network_error' => 'Contextify could not connect to the AI provider after limited retries. Check the server internet connection.',
            'malformed_response' => "{$provider} returned an unreadable response. Please try again shortly.",
            default => "{$feature} is unavailable right now. Check the AI provider configuration and try again.",
        };
    }

    /**
     * @return array<string, mixed>|null Parsed JSON content from the assistant message.
     */
    public function chatJson(string $systemPrompt, string $userPrompt): ?array
    {
        $content = $this->chatRaw($systemPrompt, $userPrompt);
        if ($content === null) {
            return null;
        }

        $decoded = json_decode($content, true);
        if (! is_array($decoded) && preg_match('/\{[\s\S]*\}/', $content, $matches)) {
            $decoded = json_decode($matches[0], true);
        }

        if (! is_array($decoded)) {
            $this->lastFailure = ['category' => 'malformed_response', 'status' => null, 'body' => null, 'retry_after' => null];
            return null;
        }

        return $decoded;
    }

    public function chatText(string $systemPrompt, string $userPrompt): ?string
    {
        return $this->chatRaw($systemPrompt, $userPrompt);
    }

    private function chatRaw(string $systemPrompt, string $userPrompt): ?string
    {
        $this->lastFailure = null;
        if (! $this->isConfigured()) {
            $this->lastFailure = ['category' => 'not_configured', 'status' => null, 'body' => null, 'retry_after' => null];

            return null;
        }

        $maxAttempts = max(1, min(5, (int) config('ai.retry_attempts', 3)));
        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                $request = Http::timeout(config('ai.timeout'));
                if (config('ai.provider') === 'gemini') {
                    $request = $request->withHeaders(['x-goog-api-key' => config('ai.api_key')]);
                    $response = $request->post(
                        config('ai.base_url').'/models/'.rawurlencode(config('ai.model')).':generateContent',
                        [
                            'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
                            'contents' => [['role' => 'user', 'parts' => [['text' => $userPrompt]]]],
                            'generationConfig' => ['temperature' => 0.3, 'responseMimeType' => 'application/json'],
                        ]
                    );
                } else {
                    $request = $request->withToken(config('ai.api_key'))->withHeaders([
                        'HTTP-Referer' => config('app.url'),
                        'X-Title' => config('app.name', 'Contextify AI'),
                    ]);
                    $response = $request->post(config('ai.base_url').'/chat/completions', [
                        'model' => config('ai.model'),
                        'temperature' => 0.3,
                        'response_format' => ['type' => 'json_object'],
                        'messages' => [
                            ['role' => 'system', 'content' => $systemPrompt],
                            ['role' => 'user', 'content' => $userPrompt],
                        ],
                    ]);
                }
            } catch (ConnectionException $exception) {
                $this->recordConnectionFailure($exception);
                if ($attempt >= $maxAttempts || ! $this->waitBeforeRetry(null, $attempt)) {
                    return null;
                }

                continue;
            } catch (Throwable $exception) {
                $this->lastFailure = [
                    'category' => 'network_error',
                    'status' => null,
                    'body' => null,
                    'retry_after' => null,
                    'message' => mb_substr($exception->getMessage(), 0, 500),
                ];
                Log::warning('AI API request could not be completed', [
                    'provider' => config('ai.provider'),
                    'model' => config('ai.model'),
                    'category' => 'network_error',
                    'exception' => $exception::class,
                    'exception_message' => $this->lastFailure['message'],
                ]);

                return null;
            }

            if ($response->successful()) {
                $this->lastFailure = null;

                $content = config('ai.provider') === 'gemini'
                    ? $response->json('candidates.0.content.parts.0.text')
                    : $response->json('choices.0.message.content');
                if (! is_string($content) || trim($content) === '') {
                    $this->lastFailure = ['category' => 'malformed_response', 'status' => 200, 'body' => null, 'retry_after' => null];
                    Log::warning('AI provider returned an empty or malformed response', [
                        'provider' => config('ai.provider'), 'model' => config('ai.model'), 'category' => 'malformed_response',
                    ]);
                    return null;
                }

                return $content;
            }

            $this->recordHttpFailure($response);
            if ($attempt >= $maxAttempts || ! $this->isRetryable($this->lastFailure['category']) || ! $this->waitBeforeRetry($response, $attempt)) {
                return null;
            }
        }

        return null;
    }

    private function recordHttpFailure(Response $response): void
    {
        $status = $response->status();
        $category = match (true) {
            $status === 429 => 'rate_limit',
            $status === 402 => 'insufficient_credits',
            in_array($status, [401, 403], true) => 'authentication',
            $status === 400 => 'invalid_request',
            $status >= 500 => 'provider_error',
            default => 'http_error',
        };
        $rawBody = $response->body();
        $configuredKey = (string) config('ai.api_key', '');
        if ($configuredKey !== '') {
            $rawBody = str_replace($configuredKey, '[redacted]', $rawBody);
        }
        $body = mb_substr($rawBody, 0, 4000);
        $providerMessage = (string) ($response->json('error.message') ?? $response->json('message') ?? '');
        if ($configuredKey !== '') {
            $providerMessage = str_replace($configuredKey, '[redacted]', $providerMessage);
        }
        $quotaScope = null;
        foreach ((array) $response->json('error.details', []) as $detail) {
            if (! is_array($detail) || ! str_contains((string) ($detail['@type'] ?? ''), 'QuotaFailure')) {
                continue;
            }
            $quotaId = (string) ($detail['violations'][0]['quotaId'] ?? '');
            $quotaDescription = strtolower((string) ($detail['violations'][0]['description'] ?? ''));
            $quotaScope = str_contains(strtolower($quotaId), 'perday') || str_contains($quotaDescription, 'per day')
                ? 'daily'
                : (str_contains(strtolower($quotaId), 'perminute') || str_contains($quotaDescription, 'per minute') ? 'minute' : null);
            break;
        }
        $this->lastFailure = [
            'category' => $category,
            'status' => $status,
            'body' => $body,
            'retry_after' => $this->retryAfterValue($response),
            'quota_scope' => $quotaScope,
            'message' => mb_substr($providerMessage, 0, 500),
        ];

        Log::warning('AI API request failed', [
            'provider' => config('ai.provider'),
            'model' => config('ai.model'),
            'category' => $category,
            'status' => $status,
            'retry_after' => $this->lastFailure['retry_after'],
            'response_body' => $body,
        ]);
    }

    private function recordConnectionFailure(ConnectionException $exception): void
    {
        $message = mb_substr($exception->getMessage(), 0, 500);
        $category = preg_match('/timed?\s*out|timeout|cURL error 28/i', $message)
            ? 'network_timeout'
            : 'network_error';

        $this->lastFailure = [
            'category' => $category,
            'status' => null,
            'body' => null,
            'retry_after' => null,
            'message' => $message,
        ];
        Log::warning('AI API connection failed', [
            'provider' => config('ai.provider'),
            'model' => config('ai.model'),
            'category' => $category,
            'exception' => $exception::class,
            'exception_message' => $message,
        ]);
    }

    private function isRetryable(string $category): bool
    {
        return in_array($category, ['rate_limit', 'provider_error', 'network_timeout', 'network_error'], true);
    }

    private function waitBeforeRetry(?Response $response, int $attempt): bool
    {
        $baseDelay = max(0, (int) config('ai.retry_base_delay_ms', 300));
        $maxDelay = max(0, (int) config('ai.retry_max_delay_ms', 2000));
        $backoffMs = min($maxDelay, $baseDelay * (2 ** max(0, $attempt - 1)));
        $retryAfter = $this->lastFailure['retry_after'] ?? $response?->header('Retry-After');
        $retryAfterMs = $this->retryAfterMilliseconds($retryAfter);
        $maxWaitMs = max(0, (int) config('ai.retry_max_wait_seconds', 5)) * 1000;

        // If the provider asks for a longer wait than this request should hold,
        // stop retrying instead of ignoring Retry-After or blocking the user.
        if ($retryAfterMs !== null && $retryAfterMs > $maxWaitMs) {
            return false;
        }

        $delayMs = max($backoffMs, $retryAfterMs ?? 0);
        if ($delayMs > 0) {
            usleep($delayMs * 1000);
        }

        return true;
    }

    private function retryAfterMilliseconds(?string $retryAfter): ?int
    {
        if ($retryAfter === null || trim($retryAfter) === '') {
            return null;
        }
        if (is_numeric($retryAfter)) {
            return max(0, (int) ceil((float) $retryAfter * 1000));
        }

        $timestamp = strtotime($retryAfter);

        return $timestamp === false ? null : max(0, ($timestamp - time()) * 1000);
    }

    private function retryAfterValue(Response $response): ?string
    {
        $header = $response->header('Retry-After');
        if ($header !== null && trim($header) !== '') {
            return $header;
        }

        foreach ((array) $response->json('error.details', []) as $detail) {
            $retryDelay = is_array($detail) ? ($detail['retryDelay'] ?? null) : null;
            if (is_string($retryDelay) && preg_match('/^(\d+(?:\.\d+)?)s$/', trim($retryDelay), $matches)) {
                return (string) ceil((float) $matches[1]);
            }
        }

        $message = (string) $response->json('error.message', '');
        if (preg_match('/retry in\s+(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?/i', $message, $matches)) {
            return (string) ceil((float) $matches[1]);
        }

        return null;
    }

    private function formatRetryWait(?string $retryAfter): ?string
    {
        if ($retryAfter === null || ! is_numeric($retryAfter) || (float) $retryAfter <= 0) {
            return null;
        }

        $seconds = (int) ceil((float) $retryAfter);
        if ($seconds >= 3600) {
            $hours = intdiv($seconds, 3600);
            $minutes = intdiv($seconds % 3600, 60);
            return $minutes > 0 ? "{$hours} hours and {$minutes} minutes" : "{$hours} hours";
        }
        if ($seconds >= 60) {
            $minutes = (int) ceil($seconds / 60);
            return $minutes === 1 ? '1 minute' : "{$minutes} minutes";
        }

        return $seconds === 1 ? '1 second' : "{$seconds} seconds";
    }
}

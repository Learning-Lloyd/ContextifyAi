<?php

$provider = strtolower((string) env('AI_PROVIDER', 'gemini'));
if (! in_array($provider, ['gemini', 'openrouter'], true)) {
    $provider = 'gemini';
}

$key = $provider === 'gemini' ? env('GEMINI_API_KEY') : env('OPENROUTER_API_KEY');
$baseUrl = $provider === 'gemini'
    ? env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta')
    : env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1');
$model = $provider === 'gemini'
    ? env('GEMINI_MODEL', 'gemini-3.5-flash-lite')
    : env('OPENROUTER_MODEL', 'openrouter/free');

return [
    'enabled' => env('AI_ENABLED', true),
    'provider' => $provider,
    'api_key' => $key,
    'base_url' => rtrim((string) $baseUrl, '/'),
    'model' => $model,
    'timeout' => (int) env('AI_TIMEOUT', 30),
    'retry_attempts' => (int) env('AI_RETRY_ATTEMPTS', 3),
    'retry_base_delay_ms' => (int) env('AI_RETRY_BASE_DELAY_MS', 300),
    'retry_max_delay_ms' => (int) env('AI_RETRY_MAX_DELAY_MS', 2000),
    'retry_max_wait_seconds' => (int) env('AI_RETRY_MAX_WAIT_SECONDS', 5),
    'rate_limits' => [
        'user_per_minute' => (int) env('AI_USER_PER_MINUTE', 5),
        'global_per_minute' => (int) env('AI_GLOBAL_PER_MINUTE', 5),
    ],
];

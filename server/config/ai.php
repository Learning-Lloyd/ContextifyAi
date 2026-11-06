<?php

$openRouterKey = env('OPENROUTER_API_KEY');
$openAiKey = env('OPENAI_API_KEY');
$geminiKey = env('GEMINI_API_KEY');
$apiKey = $openRouterKey ?: ($openAiKey ?: $geminiKey);

$provider = $openRouterKey
    ? 'openrouter'
    : ($openAiKey ? 'openai' : ($geminiKey ? 'gemini' : null));

$defaultBaseUrl = match ($provider) {
    'openrouter' => 'https://openrouter.ai/api/v1',
    'gemini' => 'https://generativelanguage.googleapis.com/v1beta/openai',
    default => 'https://api.openai.com/v1',
};

$defaultModel = match ($provider) {
    'openrouter' => 'openrouter/free',
    'gemini' => 'gemini-2.0-flash',
    default => 'gpt-4o-mini',
};

return [
    'enabled' => env('AI_ENABLED', true),
    'api_key' => $apiKey,
    'base_url' => rtrim(env($provider === 'openrouter' ? 'OPENROUTER_BASE_URL' : 'OPENAI_BASE_URL', $defaultBaseUrl), '/'),
    'model' => env($provider === 'openrouter' ? 'OPENROUTER_MODEL' : 'OPENAI_MODEL', $defaultModel),
    'timeout' => (int) env('AI_TIMEOUT', 30),
    'provider' => $provider,
];

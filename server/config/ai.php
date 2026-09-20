<?php

$openAiKey = env('OPENAI_API_KEY');
$geminiKey = env('GEMINI_API_KEY');
$apiKey = $openAiKey ?: $geminiKey;

$defaultBaseUrl = ($geminiKey && ! $openAiKey)
    ? 'https://generativelanguage.googleapis.com/v1beta/openai'
    : 'https://api.openai.com/v1';

$defaultModel = ($geminiKey && ! $openAiKey)
    ? 'gemini-2.0-flash'
    : 'gpt-4o-mini';

return [
    'enabled' => env('AI_ENABLED', true),
    'api_key' => $apiKey,
    'base_url' => rtrim(env('OPENAI_BASE_URL', $defaultBaseUrl), '/'),
    'model' => env('OPENAI_MODEL', $defaultModel),
    'timeout' => (int) env('AI_TIMEOUT', 30),
    'provider' => $openAiKey ? 'openai' : ($geminiKey ? 'gemini' : null),
];

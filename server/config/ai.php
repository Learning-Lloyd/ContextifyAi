<?php

return [
    'enabled' => env('AI_ENABLED', true),
    'api_key' => env('OPENAI_API_KEY'),
    'base_url' => rtrim(env('OPENAI_BASE_URL', 'https://api.openai.com/v1'), '/'),
    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
    'timeout' => (int) env('AI_TIMEOUT', 30),
];

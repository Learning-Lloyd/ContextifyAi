<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiClient
{
    public function isConfigured(): bool
    {
        return config('ai.enabled') && ! empty(config('ai.api_key'));
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
        if (! is_array($decoded)) {
            if (preg_match('/\{[\s\S]*\}/', $content, $matches)) {
                $decoded = json_decode($matches[0], true);
            }
        }

        return is_array($decoded) ? $decoded : null;
    }

    public function chatText(string $systemPrompt, string $userPrompt): ?string
    {
        return $this->chatRaw($systemPrompt, $userPrompt);
    }

    private function chatRaw(string $systemPrompt, string $userPrompt): ?string
    {
        if (! $this->isConfigured()) {
            return null;
        }

        try {
            $response = Http::timeout(config('ai.timeout'))
                ->withToken(config('ai.api_key'))
                ->post(config('ai.base_url') . '/chat/completions', [
                    'model' => config('ai.model'),
                    'temperature' => 0.3,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if (! $response->successful()) {
                Log::warning('AI API request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return null;
            }

            return $response->json('choices.0.message.content');
        } catch (\Throwable $exception) {
            Log::warning('AI API exception', ['message' => $exception->getMessage()]);

            return null;
        }
    }
}

<?php

namespace App\Services;

class TaskBreakdownService
{
    public function __construct(private readonly AiClient $aiClient)
    {
    }

    public function generate(array $task): ?array
    {
        $result = $this->aiClient->chatJson(
            <<<'PROMPT'
You help users break one task into smaller actionable subtasks. Return only JSON in this shape:
{"subtasks":[{"title":"...","description":"..."}]}
Create 3 to 7 small steps, ordered logically. Preserve the user's intent. Do not invent personal details, dates, durations, priority scores, or dependencies. Keep descriptions concise. These are suggestions that the user will review before saving.
PROMPT,
            json_encode($task, JSON_PRETTY_PRINT)
        );

        if (! is_array($result) || ! is_array($result['subtasks'] ?? null)) {
            return null;
        }

        return collect($result['subtasks'])
            ->take(7)
            ->map(fn ($item) => [
                'title' => trim(mb_substr((string) ($item['title'] ?? ''), 0, 255)),
                'description' => trim(mb_substr((string) ($item['description'] ?? ''), 0, 2000)),
            ])
            ->filter(fn (array $item) => $item['title'] !== '')
            ->values()
            ->all();
    }
}

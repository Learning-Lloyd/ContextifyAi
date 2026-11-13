<?php

namespace App\Services;

class TaskDescriptionService
{
    public function __construct(private readonly AiClient $aiClient) {}

    public function generate(string $title, ?string $description): ?string
    {
        $privacy = new AiPrivacyFilter();
        $result = $this->aiClient->chatJson(
            'You help users clarify tasks. Return only JSON with a single string field named description. Expand the user\'s stated intent into a concise, actionable description. Do not invent deadlines, importance, urgency, estimates, or personal context. The description is text only and must not assign or recommend a priority score.',
            json_encode(['task_title' => $privacy->redact($title), 'user_notes' => $privacy->redact($description)], JSON_PRETTY_PRINT)
        );

        $generated = trim((string) ($result['description'] ?? ''));

        return $generated !== '' ? mb_substr($generated, 0, 5000) : null;
    }

    public function unavailableMessage(): string
    {
        return $this->aiClient->unavailableMessage('AI description help');
    }
}

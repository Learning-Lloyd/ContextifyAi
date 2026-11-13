<?php

namespace App\Services;

class ImportanceAnalysisService
{
    public function __construct(private readonly AiClient $aiClient)
    {
    }

    public function analyze(string $title, ?string $description = null, bool $allowAi = true): array
    {
        $title = trim($title);
        if ($title === '') {
            return [
                'importance' => 5,
                'confidence' => 0,
                'reason' => 'Enter a task title to receive an importance suggestion.',
                'source' => 'default',
            ];
        }

        $aiResult = $allowAi ? $this->analyzeWithAi($title, $description) : null;
        if ($aiResult !== null) {
            return $aiResult;
        }

        return $this->analyzeWithHeuristic($title, $description);
    }

    private function analyzeWithAi(string $title, ?string $description): ?array
    {
        $system = <<<'PROMPT'
You suggest task importance for a prioritization system. You must NEVER compute priority scores or rankings.

Return ONLY valid JSON with this exact shape:
{
  "importance": <integer 1-10>,
  "confidence": <integer 0-100>,
  "reason": "<one concise sentence explaining the importance suggestion>"
}

Rules:
- importance must be between 1 and 10
- confidence must be between 0 and 100
- reason must be plain language for the user
- base importance on impact, consequences, and stakes described in the task
PROMPT;

        $privacy = new AiPrivacyFilter();
        $user = "Task Title:\n{$privacy->redact($title)}\n\nTask Description:\n" . ($privacy->redact($description) ?: '(none)');

        $parsed = $this->aiClient->chatJson($system, $user);
        if ($parsed === null) {
            return null;
        }

        $importance = $parsed['importance'] ?? null;
        $confidence = $parsed['confidence'] ?? null;
        $reason = trim((string) ($parsed['reason'] ?? ''));

        if (! is_numeric($importance)
            || (int) $importance != $importance
            || (int) $importance < 1
            || (int) $importance > 10
            || ! is_numeric($confidence)
            || (int) $confidence != $confidence
            || (int) $confidence < 0
            || (int) $confidence > 100
            || $reason === '') {
            return null;
        }

        $importance = (int) $importance;
        $confidence = (int) $confidence;

        return [
            'importance' => $importance,
            'confidence' => $confidence,
            'reason' => $reason,
            'source' => 'ai',
        ];
    }

    private function analyzeWithHeuristic(string $title, ?string $description): array
    {
        $text = strtolower($title . ' ' . ($description ?? ''));
        $score = 5;
        $signals = [];

        $highImpact = ['exam', 'capstone', 'thesis', 'graduation', 'defense', 'final', 'interview', 'deadline', 'presentation', 'project'];
        $mediumImpact = ['assignment', 'quiz', 'report', 'meeting', 'study', 'review', 'submit'];
        $lowImpact = ['optional', 'browse', 'watch', 'read later', 'maybe'];

        foreach ($highImpact as $word) {
            if (str_contains($text, $word)) {
                $score += 2;
                $signals[] = "high-impact keyword \"{$word}\"";
                break;
            }
        }

        foreach ($mediumImpact as $word) {
            if (str_contains($text, $word)) {
                $score += 1;
                $signals[] = "moderate-impact keyword \"{$word}\"";
                break;
            }
        }

        foreach ($lowImpact as $word) {
            if (str_contains($text, $word)) {
                $score -= 1;
                $signals[] = "lower-priority keyword \"{$word}\"";
                break;
            }
        }

        if (strlen($description ?? '') > 80) {
            $score += 1;
            $signals[] = 'detailed description suggests meaningful work';
        }

        $importance = max(1, min(10, $score));
        $confidence = min(95, 55 + count($signals) * 10);

        $reason = count($signals) > 0
            ? 'Suggested importance is based on task wording: ' . implode('; ', $signals) . '.'
            : 'Suggested importance uses a neutral baseline because no strong impact signals were detected.';

        return [
            'importance' => $importance,
            'confidence' => $confidence,
            'reason' => $reason,
            'source' => 'heuristic',
        ];
    }
}

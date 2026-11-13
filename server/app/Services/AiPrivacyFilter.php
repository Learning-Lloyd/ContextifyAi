<?php

namespace App\Services;

/** Best-effort redaction for common direct identifiers in user-authored task text; not full anonymization. */
class AiPrivacyFilter
{
    public function redact(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }

        $text = preg_replace('/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i', '[email removed]', $text);
        $text = preg_replace('/\b(?i:my\s+name\s+is|i\s+am|i\x27m|student\s+name|full\s+name|contact\s+person)\s*[:#,-]?\s+[\p{Lu}][\p{L}\x27-]*(?:\s+[\p{Lu}][\p{L}\x27-]*){1,2}\b/u', '[name removed]', $text);
        $text = preg_replace('/\b(?i:name|student\s+name|full\s+name|contact\s+person)\s*[:#-]\s*[\p{L}][\p{L}\x27-]*(?:\s+[\p{L}][\p{L}\x27-]*){1,2}\b/u', '[name removed]', $text);
        $text = preg_replace('/\b(?:student\s*(?:id|number)|school\s*id|employee\s*id|national\s*id|passport(?:\s*(?:number|no))?|user\s*name|username|\bid)\s*[:#-]?\s*[A-Z0-9][A-Z0-9-]{2,}\b/i', '[identifier removed]', $text);
        $text = preg_replace('/\b(?:date\s+of\s+birth|birth\s+date|dob)\s*[:#-]?\s*(?:\d{1,4}[\/-]){1,2}\d{1,4}\b/i', '[date removed]', $text);
        $text = preg_replace('/\b(?:home\s+address|street\s+address|address)\s*[:#-]?\s*[^,;\n]+(?:,\s*[^;\n]+)?/i', '[address removed]', $text);
        $text = preg_replace('/(?<!\w)(?:\+?\d[\d().\-\s]{7,}\d)(?!\w)/', '[phone removed]', $text);
        $text = preg_replace('/https?:\/\/\S+/i', '[link removed]', $text);

        return $text;
    }
}

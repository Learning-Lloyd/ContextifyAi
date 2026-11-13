<?php

namespace Tests\Unit;

use App\Services\AiPrivacyFilter;
use Tests\TestCase;

class AiPrivacyFilterTest extends TestCase
{
    public function test_redacts_names_emails_phones_ids_birth_dates_and_addresses_in_free_text(): void
    {
        $filter = new AiPrivacyFilter();
        $redacted = $filter->redact(
            'My name is Jane Doe. Email jane.doe@example.com, call +1 (415) 555-0199. '
            .'Student ID: STU-2026-0184, DOB: 2005-04-23, home address: 123 Main Street, Cebu City.'
        );

        $this->assertStringContainsString('[name removed]', $redacted);
        $this->assertStringContainsString('[email removed]', $redacted);
        $this->assertStringContainsString('[phone removed]', $redacted);
        $this->assertStringContainsString('[identifier removed]', $redacted);
        $this->assertStringContainsString('[date removed]', $redacted);
        $this->assertStringContainsString('[address removed]', $redacted);
        $this->assertStringNotContainsString('Jane Doe', $redacted);
        $this->assertStringNotContainsString('jane.doe@example.com', $redacted);
        $this->assertStringNotContainsString('STU-2026-0184', $redacted);
    }

    public function test_preserves_non_identifying_task_text(): void
    {
        $text = 'I am going to study chapter 4, then submit the report tomorrow.';
        $this->assertSame($text, (new AiPrivacyFilter())->redact($text));
    }
}

<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use DateTimeInterface;

class ReportTimestampFormatter
{
    public static function format(DateTimeInterface $timestamp, string $timezone): string
    {
        return CarbonImmutable::instance($timestamp)
            ->setTimezone($timezone)
            ->format('M j, Y H:i');
    }
}

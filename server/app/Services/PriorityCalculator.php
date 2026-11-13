<?php

namespace App\Services;

use InvalidArgumentException;

class PriorityCalculator
{
    public const WEIGHTS = [
        'importance' => 0.40,
        'urgency' => 0.30,
        'time_availability' => 0.20,
        'current_workload' => 0.10,
    ];

    public static function calculate(
        mixed $importance,
        mixed $urgency,
        mixed $timeAvailability,
        mixed $currentWorkload
    ): float {
        self::validateFactors($importance, $urgency, $timeAvailability, $currentWorkload);
        [$importance, $urgency, $timeAvailability, $currentWorkload] = array_map('intval', [
            $importance, $urgency, $timeAvailability, $currentWorkload,
        ]);

        $score = ($importance * self::WEIGHTS['importance'])
            + ($urgency * self::WEIGHTS['urgency'])
            + ($timeAvailability * self::WEIGHTS['time_availability'])
            + ($currentWorkload * self::WEIGHTS['current_workload']);

        return round($score, 2);
    }

    public static function breakdown(
        mixed $importance,
        mixed $urgency,
        mixed $timeAvailability,
        mixed $currentWorkload
    ): array {
        self::validateFactors($importance, $urgency, $timeAvailability, $currentWorkload);
        [$importance, $urgency, $timeAvailability, $currentWorkload] = array_map('intval', [
            $importance, $urgency, $timeAvailability, $currentWorkload,
        ]);

        return [
            'importance' => [
                'value' => $importance,
                'weight' => self::WEIGHTS['importance'],
                'weighted' => round($importance * self::WEIGHTS['importance'], 2),
            ],
            'urgency' => [
                'value' => $urgency,
                'weight' => self::WEIGHTS['urgency'],
                'weighted' => round($urgency * self::WEIGHTS['urgency'], 2),
            ],
            'time_availability' => [
                'value' => $timeAvailability,
                'weight' => self::WEIGHTS['time_availability'],
                'weighted' => round($timeAvailability * self::WEIGHTS['time_availability'], 2),
            ],
            'current_workload' => [
                'value' => $currentWorkload,
                'weight' => self::WEIGHTS['current_workload'],
                'weighted' => round($currentWorkload * self::WEIGHTS['current_workload'], 2),
            ],
            'final_score' => self::calculate(
                $importance,
                $urgency,
                $timeAvailability,
                $currentWorkload
            ),
        ];
    }

    public static function validateFactors(
        mixed $importance,
        mixed $urgency,
        mixed $timeAvailability,
        mixed $currentWorkload
    ): void {
        foreach ([
            'importance' => $importance,
            'urgency' => $urgency,
            'time_availability' => $timeAvailability,
            'current_workload' => $currentWorkload,
        ] as $name => $value) {
            $integerValue = is_int($value)
                ? $value
                : (is_string($value) && preg_match('/^-?\d+$/D', $value) ? (int) $value : null);

            if ($integerValue === null || $integerValue < 1 || $integerValue > 10) {
                throw new InvalidArgumentException("The {$name} scoring factor must be an integer from 1 to 10.");
            }
        }
    }
}

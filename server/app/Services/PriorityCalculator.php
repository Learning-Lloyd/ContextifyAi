<?php

namespace App\Services;

class PriorityCalculator
{
    public const WEIGHTS = [
        'importance' => 0.40,
        'urgency' => 0.30,
        'time_availability' => 0.20,
        'current_workload' => 0.10,
    ];

    public static function calculate(
        int $importance,
        int $urgency,
        int $timeAvailability,
        int $currentWorkload
    ): float {
        $score = ($importance * self::WEIGHTS['importance'])
            + ($urgency * self::WEIGHTS['urgency'])
            + ($timeAvailability * self::WEIGHTS['time_availability'])
            + ($currentWorkload * self::WEIGHTS['current_workload']);

        return round($score, 2);
    }

    public static function breakdown(
        int $importance,
        int $urgency,
        int $timeAvailability,
        int $currentWorkload
    ): array {
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
}

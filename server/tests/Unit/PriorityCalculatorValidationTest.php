<?php

namespace Tests\Unit;

use App\Models\Task;
use App\Services\PriorityCalculator;
use InvalidArgumentException;
use Tests\TestCase;

class PriorityCalculatorValidationTest extends TestCase
{
    public function test_calculation_rejects_factors_outside_one_to_ten(): void
    {
        foreach ([0, 11, 5.5, '5.5'] as $invalid) {
            try {
                PriorityCalculator::calculate($invalid, 5, 5, 5);
                $this->fail('An invalid scoring factor should not produce a score.');
            } catch (InvalidArgumentException $exception) {
                $this->assertStringContainsString('1 to 10', $exception->getMessage());
            }
        }
    }

    public function test_calculation_accepts_a_valid_whole_number_string_without_changing_the_formula(): void
    {
        $this->assertSame(8.3, PriorityCalculator::calculate('10', 8, 7, 5));
    }

    public function test_task_save_rejects_missing_scoring_factors_instead_of_filling_them_with_fives(): void
    {
        $task = new Task([
            'title' => 'Incomplete scoring task',
            'importance' => 5,
            'urgency' => 5,
            'time_availability' => 5,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('cannot be saved without valid 1–10 scoring factors');
        $task->save();
    }
}

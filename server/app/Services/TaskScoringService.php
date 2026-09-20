<?php

namespace App\Services;

use App\Models\Task;
use App\Models\User;

class TaskScoringService
{
    public function __construct(
        private readonly ImportanceAnalysisService $importanceAnalysisService,
        private readonly CalendarContextService $calendarContextService
    ) {
    }

    /**
     * Resolve all scoring factors server-side. Frontend values must not be trusted.
     *
     * @param  array<string, mixed>  $taskData
     * @return array<string, mixed>
     */
    public function resolveFactors(User $user, array $taskData, ?Task $existingTask = null): array
    {
        $title = trim((string) ($taskData['title'] ?? ''));
        $description = isset($taskData['description']) ? (string) $taskData['description'] : null;
        $dueDate = ! empty($taskData['due_date']) ? (string) $taskData['due_date'] : null;
        $dueTime = $taskData['due_time'] ?? null;

        $importanceAnalysis = $this->importanceAnalysisService->analyze($title, $description);
        $calendarContext = $this->calendarContextService->analyze(
            $user,
            $dueDate,
            $existingTask?->id
        );

        return [
            'importance' => $importanceAnalysis['importance'],
            'urgency' => DeadlineUrgencyService::fromDueDate($dueDate, $dueTime),
            'urgency_manual' => false,
            'time_availability' => $calendarContext['time_availability'],
            'current_workload' => $calendarContext['current_workload'],
            'importance_analysis' => $importanceAnalysis,
            'calendar_context' => $calendarContext,
        ];
    }

    /**
     * Preview scoring factors without persisting a task.
     *
     * @return array<string, mixed>
     */
    public function preview(User $user, string $title, ?string $description, ?string $dueDate, ?string $dueTime = null): array
    {
        $factors = $this->resolveFactors($user, [
            'title' => $title,
            'description' => $description,
            'due_date' => $dueDate,
            'due_time' => $dueTime,
        ]);

        $priorityScore = PriorityCalculator::calculate(
            $factors['importance'],
            $factors['urgency'],
            $factors['time_availability'],
            $factors['current_workload']
        );

        return [
            'importance' => $factors['importance'],
            'urgency' => $factors['urgency'],
            'time_availability' => $factors['time_availability'],
            'current_workload' => $factors['current_workload'],
            'priority_score' => $priorityScore,
            'breakdown' => PriorityCalculator::breakdown(
                $factors['importance'],
                $factors['urgency'],
                $factors['time_availability'],
                $factors['current_workload']
            ),
            'importance_analysis' => $factors['importance_analysis'],
            'calendar_context' => $factors['calendar_context'],
        ];
    }
}

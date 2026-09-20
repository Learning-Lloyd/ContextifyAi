<?php

namespace App\Models;

use App\Services\DeadlineUrgencyService;
use App\Services\PriorityCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    protected $attributes = [
        'status' => 'pending',
    ];

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'category',
        'notes',
        'estimated_time_minutes',
        'location',
        'latitude',
        'longitude',
        'weather_condition',
        'temperature',
        'rain_probability',
        'due_date',
        'due_time',
        'weather_last_updated',
        'importance',
        'urgency',
        'urgency_manual',
        'time_availability',
        'current_workload',
        'priority_score',
        'status',
        'archived_at',
    ];

    protected function casts(): array
    {
        return [
            'importance' => 'integer',
            'urgency' => 'integer',
            'urgency_manual' => 'boolean',
            'time_availability' => 'integer',
            'current_workload' => 'integer',
            'priority_score' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'temperature' => 'float',
            'rain_probability' => 'integer',
            'due_date' => 'date',
            'weather_last_updated' => 'datetime',
            'archived_at' => 'datetime',
            'estimated_time_minutes' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Task $task) {
            if (! $task->urgency_manual && $task->due_date) {
                $task->urgency = DeadlineUrgencyService::fromDueDate(
                    $task->due_date->format('Y-m-d'),
                    $task->due_time
                );
            }

            $task->priority_score = PriorityCalculator::calculate(
                (int) ($task->importance ?? 5),
                (int) ($task->urgency ?? 5),
                (int) ($task->time_availability ?? 5),
                (int) ($task->current_workload ?? 5)
            );
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getBreakdownAttribute(): array
    {
        return PriorityCalculator::breakdown(
            $this->importance,
            $this->urgency,
            $this->time_availability,
            $this->current_workload
        );
    }

    public function getDeadlineGroupAttribute(): string
    {
        return DeadlineUrgencyService::deadlineGroup(
            $this->due_date?->format('Y-m-d')
        );
    }

    public function getCountdownAttribute(): ?string
    {
        return DeadlineUrgencyService::countdownLabel(
            $this->due_date?->format('Y-m-d'),
            $this->due_time
        );
    }

    public function getPriorityLevelAttribute(): string
    {
        return match (true) {
            $this->priority_score >= 8 => 'high',
            $this->priority_score >= 5 => 'medium',
            default => 'low',
        };
    }

    public function getIsArchivedAttribute(): bool
    {
        return $this->archived_at !== null;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('archived_at');
    }

    public function scopeArchived($query)
    {
        return $query->whereNotNull('archived_at');
    }
}

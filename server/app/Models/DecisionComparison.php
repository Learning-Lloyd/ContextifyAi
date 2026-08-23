<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecisionComparison extends Model
{
    protected $fillable = [
        'user_id',
        'task_a',
        'task_b',
        'score_a',
        'score_b',
        'recommended_task',
        'score_difference',
        'confidence',
        'explanation',
    ];

    protected function casts(): array
    {
        return [
            'task_a' => 'array',
            'task_b' => 'array',
            'score_a' => 'float',
            'score_b' => 'float',
            'score_difference' => 'float',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

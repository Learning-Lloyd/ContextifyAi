<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DecisionAnalysis extends Model
{
    protected $fillable = [
        'user_id',
        'task_ids',
        'ranked_tasks',
        'summary',
        'recommendation',
        'conflicts',
        'total_selected',
    ];

    protected function casts(): array
    {
        return [
            'task_ids' => 'array',
            'ranked_tasks' => 'array',
            'summary' => 'array',
            'recommendation' => 'array',
            'conflicts' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

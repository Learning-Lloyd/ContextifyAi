<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Goal extends Model
{
    protected $fillable = ['user_id', 'title', 'target_count', 'starts_on', 'ends_on', 'category'];

    protected function casts(): array
    {
        return ['starts_on' => 'date', 'ends_on' => 'date', 'target_count' => 'integer'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

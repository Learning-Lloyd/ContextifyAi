<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'is_active',
        'last_login_at',
        'city',
        'city_latitude',
        'city_longitude',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'last_login_at' => 'datetime',
            'city_latitude' => 'float',
            'city_longitude' => 'float',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function decisionComparisons(): HasMany
    {
        return $this->hasMany(DecisionComparison::class);
    }

    public function decisionAnalyses(): HasMany
    {
        return $this->hasMany(DecisionAnalysis::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }
}

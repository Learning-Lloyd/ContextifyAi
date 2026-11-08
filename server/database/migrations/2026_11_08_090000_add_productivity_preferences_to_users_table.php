<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('task_reminders_enabled')->default(true);
            $table->boolean('overdue_reminders_enabled')->default(true);
            $table->unsignedSmallInteger('deadline_reminder_minutes')->default(1440);
            $table->unsignedSmallInteger('daily_available_minutes')->nullable();
            $table->time('workday_start_time')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'task_reminders_enabled',
                'overdue_reminders_enabled',
                'deadline_reminder_minutes',
                'daily_available_minutes',
                'workday_start_time',
            ]);
        });
    }
};

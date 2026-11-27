<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->date('scheduled_start_date')->nullable();
            $table->time('scheduled_start_time')->nullable();
            $table->index(['user_id', 'scheduled_start_date']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'scheduled_start_date']);
            $table->dropColumn(['scheduled_start_date', 'scheduled_start_time']);
        });
    }
};

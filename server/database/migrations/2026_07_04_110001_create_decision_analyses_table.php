<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decision_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('task_ids');
            $table->json('ranked_tasks');
            $table->json('summary')->nullable();
            $table->json('recommendation')->nullable();
            $table->json('conflicts')->nullable();
            $table->unsignedSmallInteger('total_selected')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decision_analyses');
    }
};

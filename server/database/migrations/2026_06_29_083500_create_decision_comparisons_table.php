<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('decision_comparisons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('task_a');
            $table->json('task_b');
            $table->decimal('score_a', 5, 2);
            $table->decimal('score_b', 5, 2);
            $table->enum('recommended_task', ['task_a', 'task_b', 'tie']);
            $table->decimal('score_difference', 5, 2);
            $table->string('confidence', 20);
            $table->text('explanation');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('decision_comparisons');
    }
};

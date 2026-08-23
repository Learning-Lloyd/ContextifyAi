<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('category')->nullable()->after('description');
            $table->text('notes')->nullable()->after('category');
            $table->unsignedSmallInteger('estimated_time_minutes')->nullable()->after('notes');
            $table->timestamp('archived_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn(['category', 'notes', 'estimated_time_minutes', 'archived_at']);
        });
    }
};

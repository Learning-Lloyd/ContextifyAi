<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('location')->nullable()->after('description');
            $table->decimal('latitude', 10, 7)->nullable()->after('location');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->string('weather_condition')->nullable()->after('longitude');
            $table->decimal('temperature', 5, 2)->nullable()->after('weather_condition');
            $table->unsignedTinyInteger('rain_probability')->nullable()->after('temperature');
            $table->date('due_date')->nullable()->after('rain_probability');
            $table->time('due_time')->nullable()->after('due_date');
            $table->timestamp('weather_last_updated')->nullable()->after('due_time');
            $table->boolean('urgency_manual')->default(false)->after('urgency');
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn([
                'location',
                'latitude',
                'longitude',
                'weather_condition',
                'temperature',
                'rain_probability',
                'due_date',
                'due_time',
                'weather_last_updated',
                'urgency_manual',
            ]);
        });
    }
};

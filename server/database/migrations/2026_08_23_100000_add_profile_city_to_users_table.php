<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('city')->nullable()->after('last_login_at');
            $table->decimal('city_latitude', 10, 7)->nullable()->after('city');
            $table->decimal('city_longitude', 10, 7)->nullable()->after('city_latitude');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['city', 'city_latitude', 'city_longitude']);
        });
    }
};

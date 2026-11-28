<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Null for accounts that existed before enforcement; only new signups are gated.
            $table->timestamp('email_verification_required_at')->nullable()->after('email_verified_at');
        });

        Schema::create('email_verification_challenges', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->char('code_hash', 64);
            $table->timestamp('expires_at')->index();
            $table->unsignedTinyInteger('failed_attempts')->default(0);
            $table->timestamp('last_sent_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_challenges');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_verification_required_at');
        });
    }
};

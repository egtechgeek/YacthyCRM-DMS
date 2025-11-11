<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mfa_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->text('totp_secret')->nullable();
            $table->boolean('email_2fa_enabled')->default(false);
            $table->json('recovery_codes')->nullable();
            $table->boolean('mfa_enabled')->default(false);
            $table->enum('mfa_method', ['totp', 'email', 'both'])->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mfa_settings');
    }
};


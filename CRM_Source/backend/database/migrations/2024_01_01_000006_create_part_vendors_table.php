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
        Schema::create('part_vendors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique(); // defender, port_supply, mcmaster_carr
            $table->string('website_url')->nullable();
            $table->string('api_endpoint')->nullable();
            $table->text('api_credentials')->nullable(); // JSON for API keys, etc.
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('part_vendors');
    }
};


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
        Schema::create('yachts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('type')->nullable();
            $table->text('description')->nullable();
            
            // Maritime Identification Fields
            $table->string('hull_identification_number')->nullable()->unique();
            $table->string('manufacturer_hull_number')->nullable();
            $table->string('doc_official_number')->nullable();
            $table->string('imo_number')->nullable();
            $table->string('mmsi_number')->nullable();
            $table->string('flag')->nullable();
            
            // Dimensions
            $table->decimal('length', 10, 2)->nullable();
            $table->decimal('breadth', 10, 2)->nullable();
            $table->decimal('beam', 10, 2)->nullable();
            $table->decimal('draft', 10, 2)->nullable();
            $table->decimal('airdraft', 10, 2)->nullable();
            
            // Build Information
            $table->integer('build_year')->nullable();
            
            // Tonnage
            $table->decimal('net_tonnage', 10, 2)->nullable();
            $table->decimal('gross_tonnage', 10, 2)->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('yachts');
    }
};


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
        Schema::create('part_vendor_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained()->onDelete('cascade');
            $table->foreignId('vendor_id')->constrained('part_vendors')->onDelete('cascade');
            $table->string('vendor_part_number');
            $table->string('vendor_part_url')->nullable();
            $table->decimal('vendor_price', 10, 2)->nullable();
            $table->text('vendor_data')->nullable(); // JSON for additional vendor-specific data
            $table->timestamps();
            
            $table->unique(['part_id', 'vendor_id', 'vendor_part_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('part_vendor_mappings');
    }
};


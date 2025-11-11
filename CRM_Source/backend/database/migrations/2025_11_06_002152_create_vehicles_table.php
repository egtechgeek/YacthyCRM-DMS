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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('vehicle_type', ['car', 'truck', 'suv', 'van', 'rv', 'motorcycle', 'boat', 'trailer', 'other'])->default('car');
            $table->integer('year')->nullable();
            $table->string('make')->nullable();
            $table->string('model')->nullable();
            $table->string('vin', 17)->nullable()->unique();
            $table->string('license_plate')->nullable();
            $table->string('color')->nullable();
            $table->integer('mileage')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_price', 10, 2)->nullable();
            $table->date('sale_date')->nullable();
            $table->decimal('sale_price', 10, 2)->nullable();
            $table->enum('status', ['inventory', 'sold', 'service', 'consignment'])->default('inventory');
            $table->string('stock_number')->nullable();
            $table->text('notes')->nullable();
            $table->text('features')->nullable(); // JSON field for vehicle features
            $table->timestamps();
            
            $table->index('customer_id');
            $table->index('status');
            $table->index('vehicle_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};

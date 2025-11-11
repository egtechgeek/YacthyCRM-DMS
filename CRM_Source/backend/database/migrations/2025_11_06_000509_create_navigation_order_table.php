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
        Schema::create('navigation_order', function (Blueprint $table) {
            $table->id();
            $table->string('role'); // admin, office_staff, employee, customer
            $table->string('item_key'); // dashboard, users, customers, etc.
            $table->integer('display_order')->default(0);
            $table->string('parent_key')->nullable(); // for nested items
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->unique(['role', 'item_key']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('navigation_order');
    }
};

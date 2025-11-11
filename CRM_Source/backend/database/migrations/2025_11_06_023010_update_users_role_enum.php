<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update existing 'staff' roles to 'office_staff'
        DB::table('users')->where('role', 'staff')->update(['role' => 'office_staff']);
        
        // Modify the enum to include all roles
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'office_staff', 'accountant', 'employee', 'customer') NOT NULL DEFAULT 'customer'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert accountant and employee roles to customer
        DB::table('users')->where('role', 'accountant')->update(['role' => 'customer']);
        DB::table('users')->where('role', 'employee')->update(['role' => 'customer']);
        
        // Revert office_staff to staff
        DB::table('users')->where('role', 'office_staff')->update(['role' => 'staff']);
        
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'staff', 'customer') NOT NULL DEFAULT 'customer'");
    }
};

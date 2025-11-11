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
        Schema::table('settings', function (Blueprint $table) {
            $table->string('crm_name')->nullable()->after('value');
            $table->string('logo_login')->nullable()->after('crm_name');
            $table->string('logo_header')->nullable()->after('logo_login');
            $table->string('logo_invoice')->nullable()->after('logo_header');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn(['crm_name', 'logo_login', 'logo_header', 'logo_invoice']);
        });
    }
};

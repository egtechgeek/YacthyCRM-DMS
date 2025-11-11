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
            $table->string('business_name')->nullable()->after('logo_invoice');
            $table->string('business_legal_name')->nullable()->after('business_name');
            $table->string('business_phone')->nullable()->after('business_legal_name');
            $table->string('business_email')->nullable()->after('business_phone');
            $table->string('business_website')->nullable()->after('business_email');
            $table->string('business_tax_id')->nullable()->after('business_website');
            $table->string('business_address_line1')->nullable()->after('business_tax_id');
            $table->string('business_address_line2')->nullable()->after('business_address_line1');
            $table->string('business_city')->nullable()->after('business_address_line2');
            $table->string('business_state')->nullable()->after('business_city');
            $table->string('business_postal_code')->nullable()->after('business_state');
            $table->string('business_country')->nullable()->after('business_postal_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn([
                'business_name',
                'business_legal_name',
                'business_phone',
                'business_email',
                'business_website',
                'business_tax_id',
                'business_address_line1',
                'business_address_line2',
                'business_city',
                'business_state',
                'business_postal_code',
                'business_country',
            ]);
        });
    }
};


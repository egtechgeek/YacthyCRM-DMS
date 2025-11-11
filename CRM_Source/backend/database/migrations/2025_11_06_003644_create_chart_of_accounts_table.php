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
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('account_number', 10)->unique();
            $table->string('account_name');
            $table->enum('account_type', ['asset', 'liability', 'equity', 'revenue', 'expense', 'other_income', 'other_expense', 'cost_of_goods_sold'])->default('asset');
            $table->enum('detail_type', [
                'bank', 'accounts_receivable', 'other_current_asset', 'fixed_asset', 'other_asset',
                'accounts_payable', 'credit_card', 'other_current_liability', 'long_term_liability',
                'equity', 'income', 'other_income', 'expense', 'other_expense', 'cost_of_goods_sold'
            ])->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('chart_of_accounts')->onDelete('set null');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_sub_account')->default(false);
            $table->text('description')->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->date('opening_balance_date')->nullable();
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->timestamps();
            
            $table->index('account_type');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('chart_of_accounts');
    }
};

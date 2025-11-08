<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ChartOfAccount;

class ChartOfAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates a basic QuickBooks-style Chart of Accounts
     */
    public function run(): void
    {
        $accounts = [
            // ASSETS
            ['account_number' => '1000', 'account_name' => 'Cash and Bank Accounts', 'account_type' => 'asset', 'detail_type' => 'bank'],
            ['account_number' => '1100', 'account_name' => 'Accounts Receivable', 'account_type' => 'asset', 'detail_type' => 'accounts_receivable'],
            ['account_number' => '1200', 'account_name' => 'Inventory', 'account_type' => 'asset', 'detail_type' => 'other_current_asset'],
            ['account_number' => '1500', 'account_name' => 'Equipment', 'account_type' => 'asset', 'detail_type' => 'fixed_asset'],
            ['account_number' => '1600', 'account_name' => 'Vehicles', 'account_type' => 'asset', 'detail_type' => 'fixed_asset'],
            
            // LIABILITIES
            ['account_number' => '2000', 'account_name' => 'Accounts Payable', 'account_type' => 'liability', 'detail_type' => 'accounts_payable'],
            ['account_number' => '2100', 'account_name' => 'Credit Cards', 'account_type' => 'liability', 'detail_type' => 'credit_card'],
            ['account_number' => '2500', 'account_name' => 'Long Term Liabilities', 'account_type' => 'liability', 'detail_type' => 'long_term_liability'],
            
            // EQUITY
            ['account_number' => '3000', 'account_name' => 'Opening Balance Equity', 'account_type' => 'equity', 'detail_type' => 'equity'],
            ['account_number' => '3100', 'account_name' => 'Retained Earnings', 'account_type' => 'equity', 'detail_type' => 'equity'],
            ['account_number' => '3200', 'account_name' => 'Owner\'s Equity', 'account_type' => 'equity', 'detail_type' => 'equity'],
            
            // REVENUE/INCOME
            ['account_number' => '4000', 'account_name' => 'Service Revenue', 'account_type' => 'revenue', 'detail_type' => 'income'],
            ['account_number' => '4100', 'account_name' => 'Product Sales', 'account_type' => 'revenue', 'detail_type' => 'income'],
            ['account_number' => '4500', 'account_name' => 'Other Income', 'account_type' => 'other_income', 'detail_type' => 'other_income'],
            
            // COST OF GOODS SOLD
            ['account_number' => '5000', 'account_name' => 'Cost of Goods Sold', 'account_type' => 'cost_of_goods_sold', 'detail_type' => 'cost_of_goods_sold'],
            
            // EXPENSES
            ['account_number' => '6000', 'account_name' => 'Payroll Expenses', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6100', 'account_name' => 'Rent Expense', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6200', 'account_name' => 'Utilities', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6300', 'account_name' => 'Insurance', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6400', 'account_name' => 'Office Supplies', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6500', 'account_name' => 'Repairs and Maintenance', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6600', 'account_name' => 'Advertising', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6700', 'account_name' => 'Professional Fees', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6800', 'account_name' => 'Depreciation Expense', 'account_type' => 'expense', 'detail_type' => 'expense'],
            ['account_number' => '6900', 'account_name' => 'Other Expenses', 'account_type' => 'expense', 'detail_type' => 'expense'],
        ];

        foreach ($accounts as $account) {
            ChartOfAccount::updateOrCreate(
                ['account_number' => $account['account_number']],
                $account
            );
        }
    }
}

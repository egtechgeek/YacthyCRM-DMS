<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChartOfAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_number',
        'account_name',
        'account_type',
        'detail_type',
        'parent_id',
        'is_active',
        'is_sub_account',
        'description',
        'opening_balance',
        'opening_balance_date',
        'current_balance',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_sub_account' => 'boolean',
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'opening_balance_date' => 'date',
    ];

    /**
     * Get the parent account
     */
    public function parent()
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get sub-accounts
     */
    public function subAccounts()
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id');
    }

    /**
     * Get journal entry lines for this account
     */
    public function journalEntryLines()
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    /**
     * Calculate balance from journal entries
     */
    public function calculateBalance()
    {
        $lines = $this->journalEntryLines()
            ->whereHas('journalEntry', function($query) {
                $query->where('status', 'posted');
            })
            ->get();

        $debits = $lines->sum('debit');
        $credits = $lines->sum('credit');

        // Asset, Expense accounts: Debit increases, Credit decreases
        if (in_array($this->account_type, ['asset', 'expense', 'cost_of_goods_sold'])) {
            return $this->opening_balance + ($debits - $credits);
        }
        
        // Liability, Equity, Revenue accounts: Credit increases, Debit decreases
        return $this->opening_balance + ($credits - $debits);
    }

    /**
     * Get full account name with hierarchy
     */
    public function getFullNameAttribute()
    {
        if ($this->parent) {
            return $this->parent->account_name . ':' . $this->account_name;
        }
        return $this->account_name;
    }
}

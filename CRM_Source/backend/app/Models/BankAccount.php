<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_name',
        'account_number',
        'bank_name',
        'routing_number',
        'chart_account_id',
        'opening_balance',
        'opening_balance_date',
        'current_balance',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'current_balance' => 'decimal:2',
        'opening_balance_date' => 'date',
        'is_active' => 'boolean',
    ];

    /**
     * Get the linked chart of accounts entry
     */
    public function chartAccount()
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_account_id');
    }
}

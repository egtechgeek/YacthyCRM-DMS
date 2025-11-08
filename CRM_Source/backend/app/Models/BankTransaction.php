<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_account_id',
        'transaction_date',
        'type',
        'check_number',
        'payee',
        'description',
        'debit',
        'credit',
        'balance',
        'account_id',
        'is_reconciled',
        'reconciled_date',
        'reference',
        'memo',
        'created_by',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'reconciled_date' => 'date',
        'is_reconciled' => 'boolean',
    ];

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

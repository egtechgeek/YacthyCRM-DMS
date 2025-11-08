<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GeneralLedgerEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'account_name',
        'transaction_type',
        'transaction_date',
        'transaction_number',
        'name',
        'memo',
        'split',
        'debit',
        'credit',
        'running_balance',
        'source',
        'external_reference',
    ];

    protected $casts = [
        'transaction_date' => 'date',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
        'running_balance' => 'decimal:2',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }
}


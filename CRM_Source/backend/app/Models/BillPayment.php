<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BillPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'bill_id',
        'bank_account_id',
        'payment_date',
        'amount',
        'payment_method',
        'check_number',
        'reference',
        'memo',
        'created_by',
    ];

    protected $casts = [
        'payment_date' => 'date',
    ];

    public function bill()
    {
        return $this->belongsTo(Bill::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

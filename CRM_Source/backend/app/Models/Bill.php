<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Bill extends Model
{
    use HasFactory;

    protected $skipStatusUpdate = false;

    protected $fillable = [
        'vendor_id',
        'bill_number',
        'bill_date',
        'due_date',
        'ref_number',
        'status',
        'subtotal',
        'tax',
        'tax_name',
        'total',
        'amount_paid',
        'balance',
        'memo',
        'terms',
    ];

    protected $casts = [
        'bill_date' => 'date',
        'due_date' => 'date',
        'tax' => 'float',
        'tax_name' => 'string',
        'subtotal' => 'float',
        'total' => 'float',
        'amount_paid' => 'float',
        'balance' => 'float',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($bill) {
            if (empty($bill->bill_number)) {
                $year = now()->format('y');
                $month = now()->format('m');
                $lastBill = static::whereYear('created_at', now()->year)
                    ->whereMonth('created_at', now()->month)
                    ->latest('id')
                    ->first();
                $sequence = $lastBill ? (intval(substr($lastBill->bill_number, -4)) + 1) : 1;
                $bill->bill_number = sprintf('B%s%s%04d', $year, $month, $sequence);
            }

            if (empty($bill->balance)) {
                $bill->balance = $bill->total;
            }
        });

        static::saved(function ($bill) {
            if ($bill->skipStatusUpdate ?? false) {
                $bill->skipStatusUpdate = false;
                return;
            }

            $bill->updateStatus();
        });
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function items()
    {
        return $this->hasMany(BillItem::class);
    }

    public function payments()
    {
        return $this->hasMany(BillPayment::class);
    }

    public function updateStatus()
    {
        $amountPaid = $this->payments()->sum('amount');
        $this->amount_paid = $amountPaid;
        $this->balance = $this->total - $amountPaid;

        if ($this->balance <= 0) {
            $this->status = 'paid';
        } elseif ($amountPaid > 0) {
            $this->status = 'partial';
        } elseif (Carbon::parse($this->due_date)->isPast()) {
            $this->status = 'overdue';
        } else {
            $this->status = 'unpaid';
        }

        $this->saveQuietly();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Vehicle;

class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'quote_number',
        'customer_id',
        'yacht_id',
        'vehicle_id',
        'status',
        'expiration_date',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'tax_name',
        'total',
        'notes',
    ];

    protected $casts = [
        'expiration_date' => 'date',
        'subtotal' => 'float',
        'tax_rate' => 'float',
        'tax_amount' => 'float',
        'tax_name' => 'string',
        'total' => 'float',
    ];

    /**
     * Relationship with Customer
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relationship with Yacht
     */
    public function yacht()
    {
        return $this->belongsTo(Yacht::class);
    }

    /**
     * Relationship with Vehicle
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Relationship with Quote Items
     */
    public function items()
    {
        return $this->hasMany(QuoteItem::class)->orderBy('sort_order');
    }

    /**
     * Generate quote number
     */
    public static function generateQuoteNumber(): string
    {
        $year = date('Y');
        $lastQuote = self::where('quote_number', 'like', "QT-{$year}-%")
            ->orderBy('quote_number', 'desc')
            ->first();

        if ($lastQuote) {
            $number = (int) substr($lastQuote->quote_number, -6) + 1;
        } else {
            $number = 1;
        }

        return 'QT-' . $year . '-' . str_pad($number, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Calculate totals
     */
    public function calculateTotals()
    {
        $subtotal = $this->items->sum('total');
        $taxAmount = $subtotal * ($this->tax_rate / 100);
        $total = $subtotal + $taxAmount;

        $this->update([
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total' => $total,
        ]);
    }
}


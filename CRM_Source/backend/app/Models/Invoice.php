<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Vehicle;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'quote_id',
        'customer_id',
        'yacht_id',
        'vehicle_id',
        'status',
        'issue_date',
        'due_date',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'tax_name',
        'total',
        'paid_amount',
        'balance',
        'notes',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'float',
        'tax_rate' => 'float',
        'tax_amount' => 'float',
        'tax_name' => 'string',
        'total' => 'float',
        'paid_amount' => 'float',
        'balance' => 'float',
    ];

    /**
     * Relationship with Quote
     */
    public function quote()
    {
        return $this->belongsTo(Quote::class);
    }

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
     * Relationship with Invoice Items
     */
    public function items()
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    /**
     * Relationship with Payments
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Generate invoice number
     * Format: YY-MMDDTTTT (e.g., 25-05091311 for May 9, 2025 at 1:11pm)
     */
    public static function generateInvoiceNumber(): string
    {
        $yy = date('y');      // 2-digit year
        $mm = date('m');      // 2-digit month
        $dd = date('d');      // 2-digit day
        $hhmm = date('Hi');   // 24-hour time (e.g., 1311 for 1:11pm)
        
        $baseNumber = "{$yy}-{$mm}{$dd}{$hhmm}";
        
        // Check if this number already exists (unlikely but possible)
        $exists = self::where('invoice_number', $baseNumber)->exists();
        
        if ($exists) {
            // Append a counter if duplicate
            $counter = 1;
            while (self::where('invoice_number', "{$baseNumber}-{$counter}")->exists()) {
                $counter++;
            }
            return "{$baseNumber}-{$counter}";
        }
        
        return $baseNumber;
    }

    /**
     * Calculate totals
     */
    public function calculateTotals()
    {
        $items = $this->items;

        $hasDetailedLineItems = $items->count() > 1
            || $items->contains(function ($item) {
                return !empty($item->part_id) || !empty($item->service_id);
            });

        if ($hasDetailedLineItems) {
            $subtotal = round($items->sum('total'), 2);
        } else {
            $subtotal = $this->subtotal ?? round($items->sum('total'), 2);
        }

        if ($subtotal === null) {
            $subtotal = 0;
        }

        if ($this->tax_rate !== null) {
            $taxAmount = round($subtotal * ($this->tax_rate / 100), 2);
        } else {
            $taxAmount = $this->tax_amount ?? 0;
        }

        if (!$hasDetailedLineItems && $this->tax_amount !== null) {
            $taxAmount = $this->tax_amount;
        }

        $total = $this->total ?? round($subtotal + $taxAmount, 2);
        if ($hasDetailedLineItems) {
            $total = round($subtotal + $taxAmount, 2);
        }

        $paidAmount = round(
            $this->payments()
                ->where('status', 'completed')
                ->sum('amount'),
            2
        );

        $balance = round($total - $paidAmount, 2);
        if ($balance < 0) {
            $balance = 0;
        }

        $isPastDue = $this->due_date ? now()->greaterThan($this->due_date) : false;

        if ($balance <= 0.01) {
            $status = 'paid';
            $balance = 0;
        } elseif ($paidAmount > 0.01 && $balance > 0.01) {
            $status = $isPastDue ? 'overdue' : 'partial';
        } elseif ($isPastDue) {
            $status = 'overdue';
        } else {
            $status = 'sent';
        }

        $this->update([
            'subtotal' => $subtotal,
            'tax_amount' => $taxAmount,
            'total' => $total,
            'paid_amount' => $paidAmount,
            'balance' => $balance,
            'status' => $status,
        ]);
    }

    /**
     * Check if invoice is overdue
     */
    public function isOverdue(): bool
    {
        return $this->balance > 0 && now()->greaterThan($this->due_date);
    }
}


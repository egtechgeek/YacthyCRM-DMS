<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'item_type',
        'part_id',
        'service_id',
        'description',
        'quantity',
        'unit_price',
        'discount',
        'total',
        'sort_order',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'float',
        'discount' => 'float',
        'total' => 'float',
        'sort_order' => 'integer',
    ];

    /**
     * Relationship with Invoice
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Relationship with Part
     */
    public function part()
    {
        return $this->belongsTo(Part::class);
    }

    /**
     * Relationship with Service
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Calculate total
     */
    public function calculateTotal()
    {
        $subtotal = $this->quantity * $this->unit_price;
        $this->total = $subtotal - $this->discount;
        $this->save();
        
        // Recalculate invoice totals
        $this->invoice->calculateTotals();
    }
}


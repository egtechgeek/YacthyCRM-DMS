<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrder extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_number',
        'customer_id',
        'vehicle_id',
        'invoice_id',
        'key_tag_number',
        'assigned_to',
        'status',
        'priority',
        'title',
        'description',
        'customer_concerns',
        'work_performed',
        'parts_needed',
        'estimated_hours',
        'actual_hours',
        'due_date',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'estimated_hours' => 'decimal:2',
        'actual_hours' => 'decimal:2',
        'due_date' => 'date',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the customer that owns the work order
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the vehicle associated with the work order
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Get the invoice associated with the work order
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    /**
     * Get the user assigned to the work order
     */
    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Generate next work order number
     */
    public static function generateWorkOrderNumber()
    {
        $year = date('Y');
        $prefix = "WO-{$year}-";
        
        $lastOrder = static::where('work_order_number', 'like', $prefix . '%')
            ->orderBy('work_order_number', 'desc')
            ->first();
        
        if ($lastOrder) {
            $lastNumber = (int) str_replace($prefix, '', $lastOrder->work_order_number);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }
        
        return $prefix . str_pad($newNumber, 5, '0', STR_PAD_LEFT);
    }

    /**
     * Scope for open work orders
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'open');
    }

    /**
     * Scope for in progress work orders
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope for completed work orders
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }
}

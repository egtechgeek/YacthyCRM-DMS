<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'vehicle_type',
        'year',
        'make',
        'model',
        'vin',
        'coach_number',
        'license_plate',
        'color',
        'mileage',
        'purchase_date',
        'purchase_price',
        'sale_date',
        'sale_price',
        'status',
        'stock_number',
        'notes',
        'features',
    ];

    protected $casts = [
        'year' => 'integer',
        'mileage' => 'integer',
        'purchase_date' => 'date',
        'sale_date' => 'date',
        'purchase_price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'features' => 'array',
    ];

    /**
     * Get the customer that owns the vehicle
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get service history for this vehicle
     */
    public function serviceHistory()
    {
        return $this->hasMany(VehicleServiceHistory::class)->orderBy('service_date', 'desc');
    }

    /**
     * Get documents for this vehicle
     */
    public function documents()
    {
        return $this->hasMany(VehicleDocument::class);
    }

    /**
     * Get invoices for this vehicle
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Get quotes for this vehicle
     */
    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    /**
     * Get display name for vehicle
     */
    public function getDisplayNameAttribute()
    {
        $parts = array_filter([$this->year, $this->make, $this->model]);
        return implode(' ', $parts) ?: 'Unknown Vehicle';
    }
}

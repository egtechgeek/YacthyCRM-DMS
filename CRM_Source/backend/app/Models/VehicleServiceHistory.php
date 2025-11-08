<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class VehicleServiceHistory extends Model
{
    use HasFactory;

    protected $table = 'vehicle_service_history';

    protected $fillable = [
        'vehicle_id',
        'service_date',
        'service_type',
        'description',
        'cost',
        'mileage',
        'technician_id',
        'invoice_id',
        'notes',
    ];

    protected $casts = [
        'service_date' => 'date',
        'cost' => 'decimal:2',
        'mileage' => 'integer',
    ];

    /**
     * Get the vehicle this service belongs to
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Get the technician who performed the service
     */
    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    /**
     * Get the associated invoice
     */
    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }
}

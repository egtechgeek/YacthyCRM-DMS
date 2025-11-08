<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Yacht extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'name',
        'type',
        'description',
        'hull_identification_number',
        'manufacturer_hull_number',
        'doc_official_number',
        'imo_number',
        'mmsi_number',
        'flag',
        'length',
        'breadth',
        'beam',
        'draft',
        'airdraft',
        'build_year',
        'net_tonnage',
        'gross_tonnage',
    ];

    /**
     * Relationship with Customer
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relationship with Quotes
     */
    public function quotes()
    {
        return $this->hasMany(Quote::class);
    }

    /**
     * Relationship with Invoices
     */
    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * Relationship with Appointments
     */
    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    /**
     * Relationship with Maintenance Schedules
     */
    public function maintenanceSchedules()
    {
        return $this->hasMany(MaintenanceSchedule::class);
    }
}


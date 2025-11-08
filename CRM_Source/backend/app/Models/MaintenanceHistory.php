<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaintenanceHistory extends Model
{
    use HasFactory;

    protected $table = 'maintenance_history';

    protected $fillable = [
        'maintenance_schedule_id',
        'appointment_id',
        'staff_id',
        'completed_date',
        'notes',
        'cost',
    ];

    protected $casts = [
        'completed_date' => 'date',
        'cost' => 'float',
    ];

    /**
     * Relationship with Maintenance Schedule
     */
    public function maintenanceSchedule()
    {
        return $this->belongsTo(MaintenanceSchedule::class);
    }

    /**
     * Relationship with Appointment
     */
    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    /**
     * Relationship with Staff (User)
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}


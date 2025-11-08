<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'yacht_id',
        'vehicle_id',
        'staff_id',
        'service_id',
        'title',
        'description',
        'start_time',
        'end_time',
        'status',
        'notes',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
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
     * Relationship with Staff (User)
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    /**
     * Relationship with Service
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Check for conflicts
     */
    public static function hasConflict($staffId, $startTime, $endTime, $excludeId = null)
    {
        $query = self::where('staff_id', $staffId)
            ->where('status', '!=', 'cancelled')
            ->where(function($q) use ($startTime, $endTime) {
                $q->whereBetween('start_time', [$startTime, $endTime])
                  ->orWhereBetween('end_time', [$startTime, $endTime])
                  ->orWhere(function($q) use ($startTime, $endTime) {
                      $q->where('start_time', '<=', $startTime)
                        ->where('end_time', '>=', $endTime);
                  });
            });

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }
}


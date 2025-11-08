<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TimeEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'clock_in',
        'clock_out',
        'break_minutes',
        'notes',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'clock_in' => 'datetime',
        'clock_out' => 'datetime',
        'approved_at' => 'datetime',
        'break_minutes' => 'integer',
    ];

    /**
     * Get the user who owns the time entry
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the approver
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Calculate total hours worked
     */
    public function getTotalHoursAttribute()
    {
        if (!$this->clock_out) {
            return null;
        }

        $totalMinutes = $this->clock_in->diffInMinutes($this->clock_out);
        $workMinutes = $totalMinutes - $this->break_minutes;
        
        return round($workMinutes / 60, 2);
    }

    /**
     * Check if currently clocked in
     */
    public function isClockedIn()
    {
        return $this->clock_out === null;
    }

    /**
     * Get current active entry for user
     */
    public static function getCurrentEntryForUser($userId)
    {
        return self::where('user_id', $userId)
            ->whereNull('clock_out')
            ->latest('clock_in')
            ->first();
    }
}

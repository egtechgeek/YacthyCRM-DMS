<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class MaintenanceSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'yacht_id',
        'service_id',
        'task_name',
        'description',
        'frequency',
        'frequency_interval',
        'start_date',
        'next_due_date',
        'active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'next_due_date' => 'date',
        'active' => 'boolean',
    ];

    /**
     * Relationship with Yacht
     */
    public function yacht()
    {
        return $this->belongsTo(Yacht::class);
    }

    /**
     * Relationship with Service
     */
    public function service()
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * Relationship with Maintenance History
     */
    public function history()
    {
        return $this->hasMany(MaintenanceHistory::class);
    }

    /**
     * Calculate next due date
     */
    public function calculateNextDueDate()
    {
        $nextDate = Carbon::parse($this->next_due_date);

        switch ($this->frequency) {
            case 'daily':
                $nextDate->addDay();
                break;
            case 'weekly':
                $nextDate->addWeek();
                break;
            case 'monthly':
                $nextDate->addMonth();
                break;
            case 'quarterly':
                $nextDate->addMonths(3);
                break;
            case 'yearly':
                $nextDate->addYear();
                break;
            case 'custom':
                $nextDate->addDays($this->frequency_interval);
                break;
        }

        $this->update(['next_due_date' => $nextDate]);
    }

    /**
     * Generate appointment from schedule
     */
    public function generateAppointment()
    {
        if ($this->next_due_date->isPast()) {
            return null;
        }

        return Appointment::create([
            'customer_id' => $this->yacht->customer_id,
            'yacht_id' => $this->yacht_id,
            'service_id' => $this->service_id,
            'title' => $this->task_name,
            'description' => $this->description,
            'start_time' => $this->next_due_date->setTime(9, 0),
            'end_time' => $this->next_due_date->setTime(17, 0),
            'status' => 'scheduled',
        ]);
    }
}


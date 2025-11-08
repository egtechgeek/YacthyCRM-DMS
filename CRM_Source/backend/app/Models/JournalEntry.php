<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JournalEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'entry_number',
        'entry_date',
        'description',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
        'memo',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'total_debits',
        'total_credits',
    ];

    /**
     * Get the lines for this journal entry
     */
    public function lines()
    {
        return $this->hasMany(JournalEntryLine::class);
    }

    /**
     * Get the creator
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the approver
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if entry is balanced (debits = credits)
     */
    public function isBalanced()
    {
        $totalDebits = $this->lines()->sum('debit');
        $totalCredits = $this->lines()->sum('credit');
        
        return abs($totalDebits - $totalCredits) < 0.01; // Allow for rounding
    }

    /**
     * Get total debits
     */
    public function getTotalDebitsAttribute()
    {
        return $this->lines()->sum('debit');
    }

    /**
     * Get total credits
     */
    public function getTotalCreditsAttribute()
    {
        return $this->lines()->sum('credit');
    }

    /**
     * Generate next entry number
     */
    public static function generateEntryNumber()
    {
        $year = date('Y');
        $month = date('m');
        $prefix = "JE-{$year}{$month}-";
        
        $lastEntry = self::where('entry_number', 'like', "{$prefix}%")
            ->orderBy('entry_number', 'desc')
            ->first();

        if ($lastEntry) {
            $lastNumber = (int) substr($lastEntry->entry_number, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}

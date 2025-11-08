<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class VehicleDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'vehicle_id',
        'document_type',
        'file_path',
        'original_filename',
        'expiration_date',
        'notes',
    ];

    protected $casts = [
        'expiration_date' => 'date',
    ];

    /**
     * Get the vehicle this document belongs to
     */
    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    /**
     * Get the full URL for the document
     */
    public function getUrlAttribute()
    {
        return Storage::disk('public')->url($this->file_path);
    }

    /**
     * Check if document is expired
     */
    public function getIsExpiredAttribute()
    {
        if (!$this->expiration_date) {
            return false;
        }
        return $this->expiration_date->isPast();
    }
}

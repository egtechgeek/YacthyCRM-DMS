<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email',
        'phone',
        'address',
        'city',
        'state',
        'zip',
        'country',
        'billing_address',
        'billing_city',
        'billing_state',
        'billing_zip',
        'billing_country',
        'notes',
    ];

    /**
     * Relationship with User
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship with Yachts
     */
    public function yachts()
    {
        return $this->hasMany(Yacht::class);
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
}


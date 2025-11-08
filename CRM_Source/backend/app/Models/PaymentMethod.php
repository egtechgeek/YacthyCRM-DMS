<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Relationship with Payments
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}


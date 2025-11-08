<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'category',
        'hourly_rate',
        'duration_minutes',
        'active',
    ];

    protected $casts = [
        'hourly_rate' => 'float',
        'duration_minutes' => 'integer',
        'active' => 'boolean',
    ];
}


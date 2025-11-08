<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PartVendorMapping extends Model
{
    use HasFactory;

    protected $fillable = [
        'part_id',
        'vendor_id',
        'vendor_part_number',
        'vendor_part_url',
        'vendor_price',
        'vendor_data',
    ];

    protected $casts = [
        'vendor_price' => 'float',
        'vendor_data' => 'array',
    ];

    /**
     * Relationship with Part
     */
    public function part()
    {
        return $this->belongsTo(Part::class);
    }

    /**
     * Relationship with Vendor
     */
    public function vendor()
    {
        return $this->belongsTo(PartVendor::class, 'vendor_id');
    }
}


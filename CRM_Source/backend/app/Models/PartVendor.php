<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PartVendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'website_url',
        'api_endpoint',
        'api_credentials',
        'active',
    ];

    protected $casts = [
        'api_credentials' => 'array',
        'active' => 'boolean',
    ];

    /**
     * Relationship with Vendor Mappings
     */
    public function mappings()
    {
        return $this->hasMany(PartVendorMapping::class, 'vendor_id');
    }
}


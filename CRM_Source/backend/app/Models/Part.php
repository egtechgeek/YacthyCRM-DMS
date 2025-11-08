<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Part extends Model
{
    use HasFactory;

    protected $fillable = [
        'sku',
        'name',
        'description',
        'category',
        'cost',
        'price',
        'stock_quantity',
        'min_stock_level',
        'location',
        'vendor_part_numbers',
        'active',
    ];

    protected $casts = [
        'cost' => 'float',
        'price' => 'float',
        'stock_quantity' => 'integer',
        'min_stock_level' => 'integer',
        'active' => 'boolean',
    ];
    
    protected $appends = ['unit_price'];

    /**
     * Accessor for unit_price (alias for price)
     */
    public function getUnitPriceAttribute()
    {
        return $this->price;
    }
    
    /**
     * Mutator for unit_price (updates price)
     */
    public function setUnitPriceAttribute($value)
    {
        $this->attributes['price'] = $value;
    }

    /**
     * Relationship with Vendor Mappings
     */
    public function vendorMappings()
    {
        return $this->hasMany(PartVendorMapping::class);
    }

    /**
     * Check if stock is low
     */
    public function isLowStock(): bool
    {
        return $this->stock_quantity <= $this->min_stock_level;
    }
}


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
        'vendor_part_number',
        'manufacturer_part_number',
        'active',
    ];

    protected $casts = [
        'cost' => 'float',
        'price' => 'float',
        'stock_quantity' => 'integer',
        'min_stock_level' => 'integer',
        'active' => 'boolean',
    ];

    protected $appends = [
        'unit_price',
        'vendor_part_number',
        'manufacturer_part_number',
    ];

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
     * Accessor for vendor_part_number pulled from vendor_part_numbers JSON.
     */
    public function getVendorPartNumberAttribute(): ?string
    {
        $data = $this->resolveVendorPartNumbersArray();

        return $data['vendor_part_number'] ?? null;
    }

    /**
     * Accessor for manufacturer_part_number pulled from vendor_part_numbers JSON.
     */
    public function getManufacturerPartNumberAttribute(): ?string
    {
        $data = $this->resolveVendorPartNumbersArray();

        return $data['manufacturer_part_number'] ?? null;
    }

    /**
     * Merge vendor part number value into vendor_part_numbers payload.
     */
    public function setVendorPartNumberAttribute(?string $value): void
    {
        $data = $this->resolveVendorPartNumbersArray();

        if ($value === null || trim($value) === '') {
            unset($data['vendor_part_number']);
        } else {
            $data['vendor_part_number'] = trim($value);
        }

        $this->attributes['vendor_part_numbers'] = empty($data) ? null : json_encode($data);
    }

    /**
     * Merge manufacturer part number value into vendor_part_numbers payload.
     */
    public function setManufacturerPartNumberAttribute(?string $value): void
    {
        $data = $this->resolveVendorPartNumbersArray();

        if ($value === null || trim($value) === '') {
            unset($data['manufacturer_part_number']);
        } else {
            $data['manufacturer_part_number'] = trim($value);
        }

        $this->attributes['vendor_part_numbers'] = empty($data) ? null : json_encode($data);
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

    /**
     * Helper to normalize vendor_part_numbers into an array.
     */
    protected function resolveVendorPartNumbersArray(): array
    {
        $current = $this->attributes['vendor_part_numbers'] ?? null;

        if (is_array($current)) {
            return $current;
        }

        if (is_string($current) && $current !== '') {
            $decoded = json_decode($current, true);

            if (is_array($decoded)) {
                return $decoded;
            }

            return ['vendor_part_number' => $current];
        }

        $raw = $this->getRawOriginal('vendor_part_numbers');
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);

            if (is_array($decoded)) {
                return $decoded;
            }

            return ['vendor_part_number' => $raw];
        }

        return [];
    }
}


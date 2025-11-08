<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor_name',
        'company_name',
        'contact_person',
        'email',
        'phone',
        'website',
        'address',
        'city',
        'state',
        'zip',
        'country',
        'account_number',
        'payment_terms',
        'tax_id',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function bills()
    {
        return $this->hasMany(Bill::class);
    }
}

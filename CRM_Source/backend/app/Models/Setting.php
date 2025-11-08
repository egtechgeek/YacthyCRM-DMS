<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
        'crm_name',
        'logo_login',
        'logo_header',
        'logo_invoice',
        'business_name',
        'business_legal_name',
        'business_phone',
        'business_email',
        'business_website',
        'business_tax_id',
        'business_address_line1',
        'business_address_line2',
        'business_city',
        'business_state',
        'business_postal_code',
        'business_country',
    ];

    /**
     * Get setting value with type casting
     */
    public function getValueAttribute($value)
    {
        switch ($this->type) {
            case 'boolean':
                return $value === 'true' || $value === '1';
            case 'integer':
                return (int) $value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }

    /**
     * Set setting value
     */
    public function setValueAttribute($value)
    {
        switch ($this->type) {
            case 'boolean':
                $this->attributes['value'] = $value ? 'true' : 'false';
                break;
            case 'json':
                $this->attributes['value'] = json_encode($value);
                break;
            default:
                $this->attributes['value'] = (string) $value;
        }
    }

    /**
     * Get a setting value by key
     */
    public static function get($key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    /**
     * Set a setting value by key
     */
    public static function set($key, $value, $type = 'string')
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $value, 'type' => $type]
        );
    }
}

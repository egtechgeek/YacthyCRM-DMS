<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'name',
        'description',
        'enabled',
        'display_order',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'display_order' => 'integer',
    ];

    /**
     * Get all enabled modules
     */
    public static function getEnabled()
    {
        return self::where('enabled', true)
            ->orderBy('display_order')
            ->get();
    }

    /**
     * Check if a specific module is enabled
     */
    public static function isEnabled($key)
    {
        return self::where('key', $key)
            ->where('enabled', true)
            ->exists();
    }
}

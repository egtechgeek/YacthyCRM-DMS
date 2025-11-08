<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NavigationOrder extends Model
{
    use HasFactory;

    protected $table = 'navigation_order';

    protected $fillable = [
        'role',
        'item_key',
        'display_order',
        'parent_key',
        'is_visible',
    ];

    protected $casts = [
        'display_order' => 'integer',
        'is_visible' => 'boolean',
    ];

    /**
     * Get navigation order for a specific role
     */
    public static function getForRole($role)
    {
        return self::where('role', $role)
            ->orderBy('display_order')
            ->get();
    }

    /**
     * Update navigation order for a role
     */
    public static function updateForRole($role, $items)
    {
        // Delete existing order for this role
        self::where('role', $role)->delete();

        // Insert new order
        foreach ($items as $index => $item) {
            self::create([
                'role' => $role,
                'item_key' => $item['key'],
                'display_order' => $index,
                'parent_key' => $item['parent'] ?? null,
                'is_visible' => array_key_exists('is_visible', $item) ? (bool) $item['is_visible'] : true,
            ]);
        }
    }
}

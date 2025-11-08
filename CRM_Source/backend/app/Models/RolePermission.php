<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class RolePermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'role',
        'resource',
        'action',
        'granted',
    ];

    protected $casts = [
        'granted' => 'boolean',
    ];

    /**
     * Check if a role has a specific permission
     */
    public static function hasPermission(string $role, string $resource, string $action): bool
    {
        $cacheKey = "permission:{$role}:{$resource}:{$action}";

        return Cache::remember($cacheKey, 3600, function () use ($role, $resource, $action) {
            $permission = self::where('role', $role)
                ->where('resource', $resource)
                ->where('action', $action)
                ->first();

            return $permission ? $permission->granted : false;
        });
    }

    /**
     * Get all permissions for a role
     */
    public static function getRolePermissions(string $role): array
    {
        $cacheKey = "role_permissions:{$role}";

        return Cache::remember($cacheKey, 3600, function () use ($role) {
            $permissions = self::where('role', $role)
                ->where('granted', true)
                ->get();

            $grouped = [];
            foreach ($permissions as $permission) {
                if (!isset($grouped[$permission->resource])) {
                    $grouped[$permission->resource] = [];
                }
                $grouped[$permission->resource][] = $permission->action;
            }

            return $grouped;
        });
    }

    /**
     * Clear permission cache
     */
    public static function clearCache(?string $role = null)
    {
        if ($role) {
            Cache::forget("role_permissions:{$role}");
            // Clear individual permission caches for this role
            $permissions = self::where('role', $role)->get();
            foreach ($permissions as $permission) {
                Cache::forget("permission:{$role}:{$permission->resource}:{$permission->action}");
            }
        } else {
            // Clear all permission caches
            Cache::flush();
        }
    }

    /**
     * Boot method to clear cache on model events
     */
    protected static function boot()
    {
        parent::boot();

        static::saved(function ($permission) {
            self::clearCache($permission->role);
        });

        static::deleted(function ($permission) {
            self::clearCache($permission->role);
        });
    }
}


<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RolePermission;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    /**
     * Get all available roles
     */
    public function index()
    {
        $roles = [
            [
                'id' => 'admin',
                'name' => 'Admin',
                'description' => 'Full system access - manage all users, roles, and system settings',
                'permissions_count' => RolePermission::where('role', 'admin')->where('granted', true)->count(),
            ],
            [
                'id' => 'office_staff',
                'name' => 'Office Staff',
                'description' => 'Operational access - manage customers, invoices, quotes, and appointments',
                'permissions_count' => RolePermission::where('role', 'office_staff')->where('granted', true)->count(),
            ],
            [
                'id' => 'accountant',
                'name' => 'Accountant',
                'description' => 'Full accounting access - manage chart of accounts, journal entries, bills, vendors, and financial reports',
                'permissions_count' => RolePermission::where('role', 'accountant')->where('granted', true)->count(),
            ],
            [
                'id' => 'employee',
                'name' => 'Employee',
                'description' => 'Limited operational access - view most data, create appointments',
                'permissions_count' => RolePermission::where('role', 'employee')->where('granted', true)->count(),
            ],
            [
                'id' => 'customer',
                'name' => 'Customer',
                'description' => 'Self-service access - view own yachts, invoices, quotes, and appointments',
                'permissions_count' => RolePermission::where('role', 'customer')->where('granted', true)->count(),
            ],
        ];

        return response()->json(['data' => $roles], 200);
    }

    /**
     * Get permissions for a specific role
     */
    public function getPermissions($roleId)
    {
        $permissions = RolePermission::getRolePermissions($roleId);

        return response()->json([
            'role' => $roleId,
            'permissions' => $permissions
        ], 200);
    }

    /**
     * Get all permissions matrix
     */
    public function getPermissionsMatrix()
    {
        $allPermissions = RolePermission::select('role', 'resource', 'action', 'granted')
            ->orderBy('role')
            ->orderBy('resource')
            ->orderBy('action')
            ->get();

        $matrix = [];
        foreach ($allPermissions as $permission) {
            $key = "{$permission->resource}.{$permission->action}";
            if (!isset($matrix[$key])) {
                $matrix[$key] = [
                    'resource' => $permission->resource,
                    'action' => $permission->action,
                    'label' => $this->formatPermissionLabel($permission->resource, $permission->action),
                ];
            }
            $matrix[$key][$permission->role] = $permission->granted;
        }

        return response()->json([
            'permissions' => array_values($matrix),
            'roles' => ['admin', 'office_staff', 'accountant', 'employee', 'customer']
        ], 200);
    }

    /**
     * Update permissions for a role
     */
    public function updatePermissions(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'role' => ['required', 'in:admin,office_staff,accountant,employee,customer'],
            'resource' => ['required', 'string'],
            'action' => ['required', 'string'],
            'granted' => ['required', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $permission = RolePermission::updateOrCreate(
                [
                    'role' => $request->role,
                    'resource' => $request->resource,
                    'action' => $request->action,
                ],
                [
                    'granted' => $request->granted,
                ]
            );

            RolePermission::clearCache($request->role);

            return response()->json([
                'message' => 'Permission updated successfully',
                'permission' => $permission
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update permission',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk update permissions
     */
    public function bulkUpdatePermissions(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'permissions' => ['required', 'array'],
            'permissions.*.role' => ['required', 'in:admin,office_staff,accountant,employee,customer'],
            'permissions.*.resource' => ['required', 'string'],
            'permissions.*.action' => ['required', 'string'],
            'permissions.*.granted' => ['required', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($request->permissions as $permData) {
                RolePermission::updateOrCreate(
                    [
                        'role' => $permData['role'],
                        'resource' => $permData['resource'],
                        'action' => $permData['action'],
                    ],
                    [
                        'granted' => $permData['granted'],
                    ]
                );
            }

            // Clear cache for all affected roles
            $affectedRoles = collect($request->permissions)->pluck('role')->unique();
            foreach ($affectedRoles as $role) {
                RolePermission::clearCache($role);
            }

            DB::commit();

            return response()->json([
                'message' => 'Permissions updated successfully',
                'count' => count($request->permissions)
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update permissions',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Format permission label for display
     */
    private function formatPermissionLabel($resource, $action)
    {
        $resourceLabel = ucwords(str_replace('_', ' ', $resource));
        $actionLabel = ucwords(str_replace('_', ' ', $action));
        
        return "{$resourceLabel} - {$actionLabel}";
    }
}


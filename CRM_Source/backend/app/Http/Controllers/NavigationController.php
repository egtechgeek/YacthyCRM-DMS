<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\NavigationOrder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class NavigationController extends Controller
{
    /**
     * Get navigation order for current user's role
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $cacheKey = "nav_order_{$user->role}";
        $order = Cache::remember($cacheKey, 3600, function () use ($user) {
            return NavigationOrder::getForRole($user->role);
        });

        return response()->json($order, 200);
    }

    /**
     * Get navigation order for a specific role (Admin only)
     */
    public function getForRole(Request $request, $role)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $order = NavigationOrder::getForRole($role);

        return response()->json($order, 200);
    }

    /**
     * Update navigation order for a role (Admin only)
     */
    public function updateOrder(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

            $validator = Validator::make($request->all(), [
                'role' => ['required', 'string', 'in:admin,office_staff,accountant,employee,customer'],
                'items' => ['required', 'array'],
                'items.*.key' => ['required', 'string'],
                'items.*.parent' => ['nullable', 'string'],
                'items.*.is_visible' => ['nullable', 'boolean'],
            ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        NavigationOrder::updateForRole($request->role, $request->items);

        // Clear cache for this role
        Cache::forget("nav_order_{$request->role}");

        return response()->json([
            'message' => 'Navigation order updated successfully',
            'order' => NavigationOrder::getForRole($request->role)
        ], 200);
    }
}

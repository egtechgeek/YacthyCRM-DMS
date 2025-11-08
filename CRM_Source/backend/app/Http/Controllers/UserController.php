<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Get all users (admin/staff only)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = User::with(['mfaSetting', 'customer']);

        // Filter by role if provided
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['name', 'email', 'role', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $users = $query->paginate(20);

        return response()->json($users, 200);
    }

    /**
     * Get single user
     */
    public function show($id, Request $request)
    {
        $user = $request->user();
        $targetUser = User::with(['mfaSetting', 'customer'])->findOrFail($id);

        // Users can view themselves, admins/staff can view anyone
        if ($user->id !== $targetUser->id && !$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['user' => $targetUser], 200);
    }

    /**
     * Create new user (admin/staff only)
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', Password::defaults()],
            'role' => ['required', 'in:admin,office_staff,accountant,employee,customer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $newUser = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => $newUser
        ], 201);
    }

    /**
     * Update user
     */
    public function update($id, Request $request)
    {
        $user = $request->user();
        $targetUser = User::findOrFail($id);

        // Users can update themselves (except role), admins/staff can update anyone
        if ($user->id !== $targetUser->id && !$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $id],
            'password' => ['sometimes', Password::defaults()],
            'role' => ['sometimes', 'in:admin,office_staff,accountant,employee,customer'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Only admins can change roles
        if ($request->has('role') && !$user->isAdmin()) {
            return response()->json(['message' => 'Only admins can change user roles'], 403);
        }

        // Users can't change their own role (only if actually changing it)
        if ($request->has('role') && $user->id === $targetUser->id && $request->role !== $targetUser->role) {
            return response()->json(['message' => 'You cannot change your own role'], 403);
        }

        $targetUser->update($request->only(['name', 'email', 'role']));

        if ($request->has('password')) {
            $targetUser->password = Hash::make($request->password);
            $targetUser->save();
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $targetUser->fresh()
        ], 200);
    }

    /**
     * Delete user (admin only)
     */
    public function destroy($id, Request $request)
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $targetUser = User::findOrFail($id);

        // Prevent deleting yourself
        if ($user->id === $targetUser->id) {
            return response()->json(['message' => 'You cannot delete yourself'], 403);
        }

        $targetUser->delete();

        return response()->json(['message' => 'User deleted successfully'], 200);
    }
    
    /**
     * Disable MFA for a user (Admin only)
     */
    public function disableMfa(Request $request, $id)
    {
        $authUser = $request->user();

        if (!$authUser->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $user = User::findOrFail($id);
        
        // Check if user has MFA enabled
        $mfaSetting = $user->mfaSetting;
        
        if (!$mfaSetting || !$mfaSetting->mfa_enabled) {
            return response()->json(['message' => 'MFA is not enabled for this user'], 400);
        }

        // Disable MFA
        $mfaSetting->update([
            'mfa_enabled' => false,
            'email_2fa_enabled' => false,
            'totp_secret' => null,
            'mfa_method' => null,
            'recovery_codes' => null,
        ]);

        return response()->json([
            'message' => 'MFA disabled successfully for user',
            'user' => $user->fresh()
        ], 200);
    }
}


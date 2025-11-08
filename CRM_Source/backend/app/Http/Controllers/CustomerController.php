<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CustomerController extends Controller
{
    /**
     * Get all customers
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Customer::with(['user', 'yachts']);

        // Customers can only see themselves
        if ($user->isCustomer()) {
            $query->where('user_id', $user->id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['name', 'email', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $perPage = (int) $request->input('per_page', 20);

        if ($perPage <= 0) {
            $perPage = 20;
        }

        $perPage = min($perPage, 1000);

        $customers = $query->paginate($perPage);

        return response()->json($customers, 200);
    }

    /**
     * Get single customer
     */
    public function show($id, Request $request)
    {
        $user = $request->user();
        $customer = Customer::with(['user', 'yachts', 'quotes', 'invoices'])->findOrFail($id);

        // Customers can only see themselves
        if ($user->isCustomer() && $customer->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['customer' => $customer], 200);
    }

    /**
     * Create new customer
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:customers'],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'zip' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'billing_address' => ['nullable', 'string'],
            'billing_city' => ['nullable', 'string', 'max:255'],
            'billing_state' => ['nullable', 'string', 'max:255'],
            'billing_zip' => ['nullable', 'string', 'max:255'],
            'billing_country' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $customer = Customer::create($request->all());

        return response()->json([
            'message' => 'Customer created successfully',
            'customer' => $customer->load('user')
        ], 201);
    }

    /**
     * Update customer
     */
    public function update($id, Request $request)
    {
        $user = $request->user();
        $customer = Customer::findOrFail($id);

        // Customers can only update themselves
        if ($user->isCustomer() && $customer->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!$user->isAdmin() && !$user->isStaff() && !$user->isCustomer()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:customers,email,' . $id],
            'phone' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:255'],
            'state' => ['nullable', 'string', 'max:255'],
            'zip' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:255'],
            'billing_address' => ['nullable', 'string'],
            'billing_city' => ['nullable', 'string', 'max:255'],
            'billing_state' => ['nullable', 'string', 'max:255'],
            'billing_zip' => ['nullable', 'string', 'max:255'],
            'billing_country' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'user_id' => ['nullable', 'exists:users,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $customer->update($request->all());

        return response()->json([
            'message' => 'Customer updated successfully',
            'customer' => $customer->fresh()->load('user')
        ], 200);
    }

    /**
     * Delete customer (admin/staff only)
     */
    public function destroy($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $customer = Customer::findOrFail($id);
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully'], 200);
    }
}


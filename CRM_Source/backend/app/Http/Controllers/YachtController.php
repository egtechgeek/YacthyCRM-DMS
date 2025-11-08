<?php

namespace App\Http\Controllers;

use App\Models\Yacht;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class YachtController extends Controller
{
    /**
     * Get all yachts
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Yacht::with(['customer']);

        // Customers can only see their own yachts
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if ($customer) {
                $query->where('customer_id', $customer->id);
            } else {
                return response()->json(['data' => [], 'message' => 'No customer profile found'], 200);
            }
        }

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('hull_identification_number', 'like', "%{$search}%")
                  ->orWhere('imo_number', 'like', "%{$search}%")
                  ->orWhere('mmsi_number', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['name', 'type', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $yachts = $query->paginate(20);

        return response()->json($yachts, 200);
    }

    /**
     * Get single yacht
     */
    public function show($id, Request $request)
    {
        $user = $request->user();
        $yacht = Yacht::with(['customer', 'quotes', 'invoices', 'appointments', 'maintenanceSchedules'])->findOrFail($id);

        // Customers can only see their own yachts
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $yacht->customer_id !== $customer->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json(['yacht' => $yacht], 200);
    }

    /**
     * Create new yacht
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => ['required', 'exists:customers,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'hull_identification_number' => ['nullable', 'string', 'max:255', 'unique:yachts'],
            'manufacturer_hull_number' => ['nullable', 'string', 'max:255'],
            'doc_official_number' => ['nullable', 'string', 'max:255'],
            'imo_number' => ['nullable', 'string', 'max:255'],
            'mmsi_number' => ['nullable', 'string', 'max:255'],
            'flag' => ['nullable', 'string', 'max:255'],
            'length' => ['nullable', 'numeric', 'min:0'],
            'breadth' => ['nullable', 'numeric', 'min:0'],
            'beam' => ['nullable', 'numeric', 'min:0'],
            'draft' => ['nullable', 'numeric', 'min:0'],
            'airdraft' => ['nullable', 'numeric', 'min:0'],
            'build_year' => ['nullable', 'integer', 'min:1800', 'max:' . date('Y')],
            'net_tonnage' => ['nullable', 'numeric', 'min:0'],
            'gross_tonnage' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $yacht = Yacht::create($request->all());

        return response()->json([
            'message' => 'Yacht created successfully',
            'yacht' => $yacht->load('customer')
        ], 201);
    }

    /**
     * Update yacht
     */
    public function update($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $yacht = Yacht::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'hull_identification_number' => ['nullable', 'string', 'max:255', 'unique:yachts,hull_identification_number,' . $id],
            'manufacturer_hull_number' => ['nullable', 'string', 'max:255'],
            'doc_official_number' => ['nullable', 'string', 'max:255'],
            'imo_number' => ['nullable', 'string', 'max:255'],
            'mmsi_number' => ['nullable', 'string', 'max:255'],
            'flag' => ['nullable', 'string', 'max:255'],
            'length' => ['nullable', 'numeric', 'min:0'],
            'breadth' => ['nullable', 'numeric', 'min:0'],
            'beam' => ['nullable', 'numeric', 'min:0'],
            'draft' => ['nullable', 'numeric', 'min:0'],
            'airdraft' => ['nullable', 'numeric', 'min:0'],
            'build_year' => ['nullable', 'integer', 'min:1800', 'max:' . date('Y')],
            'net_tonnage' => ['nullable', 'numeric', 'min:0'],
            'gross_tonnage' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $yacht->update($request->all());

        return response()->json([
            'message' => 'Yacht updated successfully',
            'yacht' => $yacht->fresh()->load('customer')
        ], 200);
    }

    /**
     * Delete yacht
     */
    public function destroy($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $yacht = Yacht::findOrFail($id);
        $yacht->delete();

        return response()->json(['message' => 'Yacht deleted successfully'], 200);
    }
}


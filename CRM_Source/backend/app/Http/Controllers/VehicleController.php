<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Vehicle;
use Illuminate\Support\Facades\Validator;

class VehicleController extends Controller
{
    /**
     * Display a listing of vehicles
     */
    public function index(Request $request)
    {
        $query = Vehicle::with('customer');

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('make', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%")
                  ->orWhere('vin', 'like', "%{$search}%")
                  ->orWhere('license_plate', 'like', "%{$search}%")
                  ->orWhere('stock_number', 'like', "%{$search}%");
            });
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by vehicle type
        if ($request->has('vehicle_type')) {
            $query->where('vehicle_type', $request->vehicle_type);
        }

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $vehicles = $query->paginate($request->get('per_page', 15));

        return response()->json($vehicles, 200);
    }

    /**
     * Store a newly created vehicle
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => ['nullable', 'exists:customers,id'],
            'vehicle_type' => ['required', 'in:car,truck,suv,van,rv,motorcycle,boat,trailer,other'],
            'year' => ['nullable', 'integer', 'min:1900', 'max:' . (date('Y') + 1)],
            'make' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'vin' => ['nullable', 'string', 'max:17', 'unique:vehicles,vin'],
            'license_plate' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:255'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'purchase_date' => ['nullable', 'date'],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'sale_date' => ['nullable', 'date'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['required', 'in:inventory,sold,service,consignment'],
            'stock_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $vehicle = Vehicle::create($request->all());

        return response()->json($vehicle->load('customer'), 201);
    }

    /**
     * Display the specified vehicle
     */
    public function show(Request $request, $id)
    {
        $vehicle = Vehicle::with(['customer', 'serviceHistory.technician', 'serviceHistory.invoice', 'documents'])
            ->findOrFail($id);

        return response()->json(['vehicle' => $vehicle], 200);
    }

    /**
     * Update the specified vehicle
     */
    public function update(Request $request, $id)
    {
        $vehicle = Vehicle::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_id' => ['nullable', 'exists:customers,id'],
            'vehicle_type' => ['sometimes', 'in:car,truck,suv,van,rv,motorcycle,boat,trailer,other'],
            'year' => ['nullable', 'integer', 'min:1900', 'max:' . (date('Y') + 1)],
            'make' => ['nullable', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'vin' => ['nullable', 'string', 'max:17', 'unique:vehicles,vin,' . $id],
            'license_plate' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:255'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'purchase_date' => ['nullable', 'date'],
            'purchase_price' => ['nullable', 'numeric', 'min:0'],
            'sale_date' => ['nullable', 'date'],
            'sale_price' => ['nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', 'in:inventory,sold,service,consignment'],
            'stock_number' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'features' => ['nullable', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $vehicle->update($request->all());

        return response()->json($vehicle->load('customer'), 200);
    }

    /**
     * Remove the specified vehicle
     */
    public function destroy(Request $request, $id)
    {
        $vehicle = Vehicle::findOrFail($id);
        $vehicle->delete();

        return response()->json(['message' => 'Vehicle deleted successfully'], 200);
    }
}

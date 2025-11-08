<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\VehicleServiceHistory;
use Illuminate\Support\Facades\Validator;

class VehicleServiceController extends Controller
{
    /**
     * Get service history for a vehicle
     */
    public function index(Request $request)
    {
        $query = VehicleServiceHistory::with(['vehicle', 'technician', 'invoice']);

        if ($request->has('vehicle_id')) {
            $query->where('vehicle_id', $request->vehicle_id);
        }

        $history = $query->orderBy('service_date', 'desc')->paginate(15);

        return response()->json($history, 200);
    }

    /**
     * Store a new service record
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_id' => ['required', 'exists:vehicles,id'],
            'service_date' => ['required', 'date'],
            'service_type' => ['nullable', 'string'],
            'description' => ['required', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'technician_id' => ['nullable', 'exists:users,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service = VehicleServiceHistory::create($request->all());

        return response()->json($service->load(['vehicle', 'technician', 'invoice']), 201);
    }

    /**
     * Update a service record
     */
    public function update(Request $request, $id)
    {
        $service = VehicleServiceHistory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'service_date' => ['sometimes', 'date'],
            'service_type' => ['nullable', 'string'],
            'description' => ['sometimes', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'mileage' => ['nullable', 'integer', 'min:0'],
            'technician_id' => ['nullable', 'exists:users,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service->update($request->all());

        return response()->json($service->load(['vehicle', 'technician', 'invoice']), 200);
    }

    /**
     * Delete a service record
     */
    public function destroy(Request $request, $id)
    {
        $service = VehicleServiceHistory::findOrFail($id);
        $service->delete();

        return response()->json(['message' => 'Service record deleted successfully'], 200);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AppointmentController extends Controller
{
    /**
     * Get all appointments
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Appointment::with(['customer', 'yacht', 'vehicle', 'staff', 'service']);

        // Customers can only see their own appointments
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if ($customer) {
                $query->where('customer_id', $customer->id);
            } else {
                return response()->json(['data' => []], 200);
            }
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('start_time', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('end_time', '<=', $request->end_date);
        }

        // Filter by staff
        if ($request->has('staff_id')) {
            $query->where('staff_id', $request->staff_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'start_time');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['start_time', 'end_time', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('start_time', 'asc');
        }

        $appointments = $query->paginate(20);

        return response()->json($appointments, 200);
    }

    /**
     * Get single appointment
     */
    public function show($id, Request $request)
    {
        $user = $request->user();
        $appointment = Appointment::with(['customer', 'yacht', 'vehicle', 'staff', 'service'])->findOrFail($id);

        // Customers can only see their own appointments
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $appointment->customer_id !== $customer->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json(['appointment' => $appointment], 200);
    }

    /**
     * Create new appointment
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => ['required', 'exists:customers,id'],
            'yacht_id' => ['required', 'exists:yachts,id'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for conflicts if staff is assigned
        if ($request->staff_id) {
            if (Appointment::hasConflict($request->staff_id, $request->start_time, $request->end_time)) {
                return response()->json([
                    'message' => 'Staff member has a conflicting appointment',
                ], 422);
            }
        }

        if (!$request->yacht_id && !$request->vehicle_id) {
            return response()->json([
                'message' => 'Please select a ' . (\App\Models\Module::isEnabled('dms') ? 'vehicle' : 'yacht')
            ], 422);
        }

        $appointment = Appointment::create($request->all());

        return response()->json([
            'message' => 'Appointment created successfully',
            'appointment' => $appointment->load(['customer', 'yacht', 'vehicle', 'staff', 'service'])
        ], 201);
    }

    /**
     * Update appointment
     */
    public function update($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment = Appointment::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'yacht_id' => ['nullable', 'exists:yachts,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_time' => ['sometimes', 'date'],
            'end_time' => ['sometimes', 'date', 'after:start_time'],
            'status' => ['sometimes', 'in:scheduled,in_progress,completed,cancelled'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Check for conflicts if staff or time changed
        if (($request->has('staff_id') || $request->has('start_time') || $request->has('end_time')) && $request->staff_id) {
            $staffId = $request->staff_id ?? $appointment->staff_id;
            $startTime = $request->start_time ?? $appointment->start_time;
            $endTime = $request->end_time ?? $appointment->end_time;

            if (Appointment::hasConflict($staffId, $startTime, $endTime, $appointment->id)) {
                return response()->json([
                    'message' => 'Staff member has a conflicting appointment',
                ], 422);
            }
        }

        if (!$request->yacht_id && !$request->vehicle_id && !$appointment->yacht_id && !$appointment->vehicle_id) {
            return response()->json([
                'message' => 'Please select a ' . (\App\Models\Module::isEnabled('dms') ? 'vehicle' : 'yacht')
            ], 422);
        }

        $appointment->update($request->all());

        return response()->json([
            'message' => 'Appointment updated successfully',
            'appointment' => $appointment->fresh()->load(['customer', 'yacht', 'vehicle', 'staff', 'service'])
        ], 200);
    }

    /**
     * Delete appointment
     */
    public function destroy($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment = Appointment::findOrFail($id);
        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted successfully'], 200);
    }
}


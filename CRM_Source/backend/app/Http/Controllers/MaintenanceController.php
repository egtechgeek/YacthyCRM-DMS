<?php

namespace App\Http\Controllers;

use App\Models\MaintenanceSchedule;
use App\Models\MaintenanceHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MaintenanceController extends Controller
{
    /**
     * Get all maintenance schedules
     */
    public function schedules(Request $request)
    {
        $query = MaintenanceSchedule::with(['yacht.customer', 'service']);

        // Filter by yacht
        if ($request->has('yacht_id')) {
            $query->where('yacht_id', $request->yacht_id);
        }

        // Filter active
        if ($request->has('active')) {
            $query->where('active', $request->boolean('active'));
        }

        $schedules = $query->orderBy('next_due_date', 'asc')->paginate(20);

        return response()->json($schedules, 200);
    }

    /**
     * Create maintenance schedule
     */
    public function createSchedule(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'yacht_id' => ['required', 'exists:yachts,id'],
            'service_id' => ['nullable', 'exists:services,id'],
            'task_name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'frequency' => ['required', 'in:daily,weekly,monthly,quarterly,yearly,custom'],
            'frequency_interval' => ['nullable', 'integer', 'min:1'],
            'start_date' => ['required', 'date'],
            'next_due_date' => ['required', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $schedule = MaintenanceSchedule::create($request->all());

        return response()->json([
            'message' => 'Maintenance schedule created successfully',
            'schedule' => $schedule->load(['yacht.customer', 'service'])
        ], 201);
    }

    /**
     * Generate appointments from schedules
     */
    public function generateAppointments(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $schedules = MaintenanceSchedule::where('active', true)
            ->where('next_due_date', '<=', now()->addDays(7))
            ->get();

        $generated = [];
        foreach ($schedules as $schedule) {
            $appointment = $schedule->generateAppointment();
            if ($appointment) {
                $generated[] = $appointment;
                $schedule->calculateNextDueDate();
            }
        }

        return response()->json([
            'message' => count($generated) . ' appointments generated',
            'appointments' => $generated
        ], 200);
    }

    /**
     * Get maintenance history
     */
    public function history(Request $request)
    {
        $query = MaintenanceHistory::with(['maintenanceSchedule.yacht', 'appointment', 'staff']);

        // Filter by yacht
        if ($request->has('yacht_id')) {
            $query->whereHas('maintenanceSchedule', function($q) use ($request) {
                $q->where('yacht_id', $request->yacht_id);
            });
        }

        // Filter by schedule
        if ($request->has('maintenance_schedule_id')) {
            $query->where('maintenance_schedule_id', $request->maintenance_schedule_id);
        }

        $history = $query->orderBy('completed_date', 'desc')->paginate(20);

        return response()->json($history, 200);
    }

    /**
     * Record maintenance completion
     */
    public function recordCompletion(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'maintenance_schedule_id' => ['required', 'exists:maintenance_schedules,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'staff_id' => ['nullable', 'exists:users,id'],
            'completed_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'cost' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $history = MaintenanceHistory::create([
            'maintenance_schedule_id' => $request->maintenance_schedule_id,
            'appointment_id' => $request->appointment_id,
            'staff_id' => $request->staff_id ?? $user->id,
            'completed_date' => $request->completed_date,
            'notes' => $request->notes,
            'cost' => $request->cost,
        ]);

        // Update schedule next due date
        $schedule = MaintenanceSchedule::find($request->maintenance_schedule_id);
        $schedule->calculateNextDueDate();

        return response()->json([
            'message' => 'Maintenance completion recorded',
            'history' => $history->load(['maintenanceSchedule', 'appointment', 'staff'])
        ], 201);
    }
}


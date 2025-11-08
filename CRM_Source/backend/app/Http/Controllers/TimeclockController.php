<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\TimeEntry;
use App\Models\TimeOffRequest;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class TimeclockController extends Controller
{
    /**
     * Clock in
     */
    public function clockIn(Request $request)
    {
        $user = $request->user();

        // Check if already clocked in
        $activeEntry = TimeEntry::getCurrentEntryForUser($user->id);
        if ($activeEntry) {
            return response()->json([
                'message' => 'Already clocked in',
                'entry' => $activeEntry
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $entry = TimeEntry::create([
            'user_id' => $user->id,
            'clock_in' => now(),
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Clocked in successfully',
            'entry' => $entry
        ], 201);
    }

    /**
     * Clock out
     */
    public function clockOut(Request $request)
    {
        $user = $request->user();

        $activeEntry = TimeEntry::getCurrentEntryForUser($user->id);
        if (!$activeEntry) {
            return response()->json(['message' => 'Not currently clocked in'], 400);
        }

        $validator = Validator::make($request->all(), [
            'break_minutes' => ['nullable', 'integer', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $activeEntry->clock_out = now();
        $activeEntry->break_minutes = $request->break_minutes ?? 0;
        if ($request->has('notes')) {
            $activeEntry->notes = $request->notes;
        }
        $activeEntry->save();

        return response()->json([
            'message' => 'Clocked out successfully',
            'entry' => $activeEntry->load('user'),
            'total_hours' => $activeEntry->total_hours
        ], 200);
    }

    /**
     * Get current active entry
     */
    public function getCurrentEntry(Request $request)
    {
        $user = $request->user();
        $entry = TimeEntry::getCurrentEntryForUser($user->id);

        return response()->json(['entry' => $entry], 200);
    }

    /**
     * Get time entries (paginated, filterable)
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = TimeEntry::with(['user', 'approver']);

        // Filter by user if not admin/office_staff
        if (!in_array($user->role, ['admin', 'office_staff'])) {
            $query->where('user_id', $user->id);
        }

        // Filter by user_id if provided
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('clock_in', '>=', Carbon::parse($request->start_date));
        }
        if ($request->has('end_date')) {
            $query->where('clock_in', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'clock_in');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $entries = $query->paginate($request->get('per_page', 15));

        return response()->json($entries, 200);
    }

    /**
     * Approve time entry (Admin/Office Staff only)
     */
    public function approveEntry(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'office_staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $entry = TimeEntry::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => ['required', 'in:approved,rejected'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $entry->status = $request->status;
        $entry->approved_by = $user->id;
        $entry->approved_at = now();
        $entry->save();

        return response()->json([
            'message' => "Time entry {$request->status}",
            'entry' => $entry->load(['user', 'approver'])
        ], 200);
    }

    /**
     * Export time entries to CSV
     */
    public function exportCSV(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'office_staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = TimeEntry::with('user')->whereNotNull('clock_out');

        // Apply filters
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('start_date')) {
            $query->where('clock_in', '>=', Carbon::parse($request->start_date));
        }
        if ($request->has('end_date')) {
            $query->where('clock_in', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        $entries = $query->orderBy('clock_in')->get();

        // Generate CSV
        $filename = 'timeclock_export_' . date('Y-m-d') . '.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"$filename\"",
        ];

        $callback = function() use ($entries) {
            $file = fopen('php://output', 'w');
            
            // Header row
            fputcsv($file, ['Employee', 'Date', 'Clock In', 'Clock Out', 'Break (min)', 'Total Hours', 'Status', 'Notes']);

            // Data rows
            foreach ($entries as $entry) {
                fputcsv($file, [
                    $entry->user->name,
                    $entry->clock_in->format('Y-m-d'),
                    $entry->clock_in->format('H:i'),
                    $entry->clock_out ? $entry->clock_out->format('H:i') : '',
                    $entry->break_minutes,
                    $entry->total_hours ?? '',
                    ucfirst($entry->status),
                    $entry->notes ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Export time entries to PDF
     */
    public function exportPDF(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'office_staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = TimeEntry::with('user')->whereNotNull('clock_out');

        // Apply filters
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('start_date')) {
            $query->where('clock_in', '>=', Carbon::parse($request->start_date));
        }
        if ($request->has('end_date')) {
            $query->where('clock_in', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        $entries = $query->orderBy('clock_in')->get();

        $startDate = $request->start_date ?? $entries->first()?->clock_in->format('Y-m-d');
        $endDate = $request->end_date ?? $entries->last()?->clock_in->format('Y-m-d');
        $employeeName = $request->has('user_id') ? User::find($request->user_id)?->name : 'All Employees';

        $pdf = PDF::loadView('timeclock.timesheet', [
            'entries' => $entries,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'employeeName' => $employeeName,
            'totalHours' => $entries->sum('total_hours'),
        ]);

        return $pdf->download('timesheet_' . date('Y-m-d') . '.pdf');
    }

    /**
     * Time Off Requests
     */

    /**
     * Get time off requests
     */
    public function getTimeOffRequests(Request $request)
    {
        $user = $request->user();

        $query = TimeOffRequest::with(['user', 'reviewer']);

        // Filter by user if not admin/office_staff
        if (!in_array($user->role, ['admin', 'office_staff'])) {
            $query->where('user_id', $user->id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->orderBy('start_date', 'desc')->paginate(15);

        return response()->json($requests, 200);
    }

    /**
     * Create time off request
     */
    public function createTimeOffRequest(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'type' => ['required', 'in:vacation,sick,personal,unpaid'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $timeOffRequest = TimeOffRequest::create([
            'user_id' => $user->id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'type' => $request->type,
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Time off request submitted',
            'request' => $timeOffRequest->load('user')
        ], 201);
    }

    /**
     * Review time off request (Admin/Office Staff only)
     */
    public function reviewTimeOffRequest(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'office_staff'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $timeOffRequest = TimeOffRequest::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => ['required', 'in:approved,rejected'],
            'review_notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $timeOffRequest->status = $request->status;
        $timeOffRequest->reviewed_by = $user->id;
        $timeOffRequest->reviewed_at = now();
        $timeOffRequest->review_notes = $request->review_notes;
        $timeOffRequest->save();

        return response()->json([
            'message' => "Time off request {$request->status}",
            'request' => $timeOffRequest->load(['user', 'reviewer'])
        ], 200);
    }
}

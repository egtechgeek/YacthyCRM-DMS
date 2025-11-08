<?php

namespace App\Http\Controllers;

use App\Models\WorkOrder;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Support\Branding;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WorkOrderController extends Controller
{
    /**
     * Get all work orders
     */
    public function index(Request $request)
    {
        $query = WorkOrder::with(['customer', 'vehicle', 'invoice', 'assignedUser']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by priority
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }

        // Filter by assigned user
        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->input('per_page', 20);
        $workOrders = $query->paginate($perPage);

        return response()->json($workOrders, 200);
    }

    /**
     * Get work orders for display board
     */
    public function displayBoard(Request $request)
    {
        $openOrders = WorkOrder::with(['customer', 'vehicle', 'assignedUser'])
            ->where('status', 'open')
            ->orderBy('priority', 'desc')
            ->orderBy('created_at', 'asc')
            ->get();

        $inProgressOrders = WorkOrder::with(['customer', 'vehicle', 'assignedUser'])
            ->where('status', 'in_progress')
            ->orderBy('priority', 'desc')
            ->orderBy('started_at', 'asc')
            ->get();

        return response()->json([
            'open' => $openOrders,
            'in_progress' => $inProgressOrders,
            'branding' => Branding::get(),
        ], 200);
    }

    /**
     * Get single work order
     */
    public function show($id)
    {
        $workOrder = WorkOrder::with(['customer', 'vehicle', 'invoice', 'assignedUser'])->findOrFail($id);
        return response()->json([
            'work_order' => $workOrder,
            'branding' => Branding::get(),
        ], 200);
    }

    /**
     * Create new work order
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => ['required', 'exists:customers,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'key_tag_number' => ['nullable', 'string', 'max:100'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'status' => ['required', 'in:open,in_progress,completed,on_hold,cancelled'],
            'priority' => ['required', 'in:low,normal,high,urgent'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'customer_concerns' => ['nullable', 'string'],
            'work_performed' => ['nullable', 'string'],
            'parts_needed' => ['nullable', 'string'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'actual_hours' => ['nullable', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generate work order number
        $workOrderNumber = WorkOrder::generateWorkOrderNumber();

        $workOrder = WorkOrder::create(array_merge(
            $request->all(),
            ['work_order_number' => $workOrderNumber]
        ));

        // Update timestamps based on status
        if ($request->status === 'in_progress' && !$workOrder->started_at) {
            $workOrder->started_at = now();
            $workOrder->save();
        } elseif ($request->status === 'completed' && !$workOrder->completed_at) {
            $workOrder->completed_at = now();
            $workOrder->save();
        }

        return response()->json([
            'message' => 'Work order created successfully',
            'work_order' => $workOrder->load(['customer', 'vehicle', 'invoice', 'assignedUser'])
        ], 201);
    }

    /**
     * Update work order
     */
    public function update($id, Request $request)
    {
        $workOrder = WorkOrder::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'invoice_id' => ['nullable', 'exists:invoices,id'],
            'key_tag_number' => ['nullable', 'string', 'max:100'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'status' => ['sometimes', 'in:open,in_progress,completed,on_hold,cancelled'],
            'priority' => ['sometimes', 'in:low,normal,high,urgent'],
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'customer_concerns' => ['nullable', 'string'],
            'work_performed' => ['nullable', 'string'],
            'parts_needed' => ['nullable', 'string'],
            'estimated_hours' => ['nullable', 'numeric', 'min:0'],
            'actual_hours' => ['nullable', 'numeric', 'min:0'],
            'due_date' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update timestamps based on status changes
        if ($request->has('status')) {
            if ($request->status === 'in_progress' && !$workOrder->started_at) {
                $request->merge(['started_at' => now()]);
            } elseif ($request->status === 'completed' && !$workOrder->completed_at) {
                $request->merge(['completed_at' => now()]);
            }
        }

        $workOrder->update($request->all());

        return response()->json([
            'message' => 'Work order updated successfully',
            'work_order' => $workOrder->fresh()->load(['customer', 'vehicle', 'invoice', 'assignedUser'])
        ], 200);
    }

    /**
     * Delete work order
     */
    public function destroy($id)
    {
        $workOrder = WorkOrder::findOrFail($id);
        $workOrder->delete();

        return response()->json([
            'message' => 'Work order deleted successfully'
        ], 200);
    }

    /**
     * Update work order status
     */
    public function convertToInvoice($id, Request $request)
    {
        $workOrder = WorkOrder::with(['customer', 'invoice', 'vehicle'])->findOrFail($id);

        if ($workOrder->status !== 'completed') {
            return response()->json([
                'message' => 'Work order must be completed before it can be converted to an invoice.',
            ], 422);
        }

        if ($workOrder->invoice_id) {
            return response()->json([
                'message' => 'This work order is already linked to an invoice.',
                'invoice_id' => $workOrder->invoice_id,
            ], 422);
        }

        if (!$workOrder->customer) {
            return response()->json([
                'message' => 'Work order is missing an associated customer.',
            ], 422);
        }

        DB::beginTransaction();

        try {
            $issueDate = Carbon::now();
            $dueDate = (clone $issueDate)->addDays(30);

            $notesSegments = [
                'Converted from work order ' . $workOrder->work_order_number,
            ];

            if ($workOrder->key_tag_number) {
                $notesSegments[] = 'Key tag #: ' . $workOrder->key_tag_number;
            }

            if ($workOrder->customer_concerns) {
                $notesSegments[] = "Customer concerns:\n" . $workOrder->customer_concerns;
            }

            if ($workOrder->description) {
                $notesSegments[] = "Work order description:\n" . $workOrder->description;
            }

            if ($workOrder->work_performed) {
                $notesSegments[] = "Work performed:\n" . $workOrder->work_performed;
            }

            if ($workOrder->parts_needed) {
                $notesSegments[] = "Parts noted:\n" . $workOrder->parts_needed;
            }

            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'customer_id' => $workOrder->customer_id,
                'yacht_id' => null,
                'vehicle_id' => $workOrder->vehicle_id,
                'status' => 'draft',
                'issue_date' => $issueDate->format('Y-m-d'),
                'due_date' => $dueDate->format('Y-m-d'),
                'tax_rate' => 0,
                'notes' => implode("\n\n", array_filter($notesSegments)),
            ]);

            $itemDescriptionParts = [
                'Work order ' . $workOrder->work_order_number,
            ];

            if ($workOrder->work_performed) {
                $itemDescriptionParts[] = $workOrder->work_performed;
            } elseif ($workOrder->description) {
                $itemDescriptionParts[] = $workOrder->description;
            }

            $itemDescription = implode("\n\n", array_filter($itemDescriptionParts));

            $quantity = $workOrder->actual_hours && $workOrder->actual_hours > 0
                ? (float) $workOrder->actual_hours
                : 1;

            InvoiceItem::create([
                'invoice_id' => $invoice->id,
                'item_type' => 'service',
                'part_id' => null,
                'service_id' => null,
                'description' => $itemDescription ?: 'Service work',
                'quantity' => $quantity,
                'unit_price' => 0,
                'discount' => 0,
                'total' => 0,
                'sort_order' => 0,
            ]);

            $invoice->calculateTotals();

            $workOrder->invoice_id = $invoice->id;
            $workOrder->save();

            DB::commit();

            return response()->json([
                'message' => 'Invoice created successfully from work order.',
                'invoice' => $invoice->load(['customer', 'items']),
            ], 201);
        } catch (\Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Failed to convert work order to invoice.',
                'error' => $exception->getMessage(),
            ], 500);
        }
    }

    /**
     * Update work order status
     */
    public function updateStatus($id, Request $request)
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', 'in:open,in_progress,completed,on_hold,cancelled'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $workOrder = WorkOrder::findOrFail($id);
        $oldStatus = $workOrder->status;
        $newStatus = $request->status;

        $workOrder->status = $newStatus;

        // Update timestamps
        if ($newStatus === 'in_progress' && !$workOrder->started_at) {
            $workOrder->started_at = now();
        } elseif ($newStatus === 'completed' && !$workOrder->completed_at) {
            $workOrder->completed_at = now();
        }

        $workOrder->save();

        return response()->json([
            'message' => 'Work order status updated successfully',
            'work_order' => $workOrder->fresh()->load(['customer', 'vehicle', 'invoice', 'assignedUser'])
        ], 200);
    }
}

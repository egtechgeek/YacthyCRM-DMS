<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Support\Branding;

class InvoiceController extends Controller
{
    /**
     * Get all invoices
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Invoice::with(['customer', 'yacht', 'vehicle', 'items', 'payments']);

        // Customers can only see their own invoices
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if ($customer) {
                $query->where('customer_id', $customer->id);
            } else {
                return response()->json(['data' => []], 200);
            }
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filter overdue
        if ($request->has('overdue') && $request->boolean('overdue')) {
            $query->where('status', 'overdue')
                  ->orWhere(function($q) {
                      $q->where('balance', '>', 0)
                        ->where('due_date', '<', now());
                  });
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'issue_date');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['invoice_number', 'issue_date', 'due_date', 'total', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('issue_date', 'desc');
        }

        $invoices = $query->paginate(20);

        return response()->json($invoices, 200);
    }

    /**
     * Get single invoice
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $invoice = Invoice::with(['customer', 'yacht', 'vehicle', 'items.part', 'items.service', 'payments'])->findOrFail($id);

        // Customers can only see their own invoices
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $invoice->customer_id !== $customer->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'invoice' => $invoice,
            'branding' => Branding::get(),
        ], 200);
    }

    /**
     * View invoice as HTML
     */
    public function view(Request $request, $id)
    {
        $user = $request->user();
        $invoice = Invoice::with(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])->findOrFail($id);

        // Customers can only see their own invoices
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $invoice->customer_id !== $customer->id) {
                abort(403, 'Unauthorized');
            }
        }

        return view('invoices.show', [
            'invoice' => $invoice,
            'branding' => Branding::get(),
        ]);
    }

    /**
     * Download invoice as PDF
     */
    public function downloadPdf(Request $request, $id)
    {
        $user = $request->user();
        $invoice = Invoice::with(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])->findOrFail($id);

        // Customers can only download their own invoices
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $invoice->customer_id !== $customer->id) {
                abort(403, 'Unauthorized');
            }
        }

        $pdf = Pdf::loadView('invoices.show', [
            'invoice' => $invoice,
            'branding' => Branding::get(),
        ]);
        
        return $pdf->download('invoice_' . $invoice->invoice_number . '.pdf');
    }

    /**
     * Create new invoice
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => ['required', 'exists:customers,id'],
            'yacht_id' => ['nullable', 'exists:yachts,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'issue_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:issue_date'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'in:part,service'],
            'items.*.part_id' => ['nullable', 'exists:parts,id'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateInvoiceNumber(),
                'customer_id' => $request->customer_id,
                'yacht_id' => $request->yacht_id,
                'vehicle_id' => $request->vehicle_id,
                'status' => 'draft',
                'issue_date' => $request->issue_date,
                'due_date' => $request->due_date,
                'tax_rate' => $request->tax_rate ?? 0,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $index => $itemData) {
                $item = new InvoiceItem([
                    'invoice_id' => $invoice->id,
                    'item_type' => $itemData['item_type'],
                    'part_id' => $itemData['item_type'] === 'part' ? $itemData['part_id'] : null,
                    'service_id' => $itemData['item_type'] === 'service' ? $itemData['service_id'] : null,
                    'description' => $itemData['description'] ?? '',
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'discount' => $itemData['discount'] ?? 0,
                    'sort_order' => $index,
                ]);
                
                $item->calculateTotal();
            }

            $invoice->calculateTotals();

            DB::commit();

            return response()->json([
                'message' => 'Invoice created successfully',
                'invoice' => $invoice->fresh()->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update invoice
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        // Only admins can update invoices
        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $invoice = Invoice::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'yacht_id' => ['nullable', 'exists:yachts,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'status' => ['sometimes', 'in:draft,sent,paid,partial,overdue,cancelled,write-off'],
            'issue_date' => ['sometimes', 'date'],
            'due_date' => ['sometimes', 'date'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array'],
            'items.*.item_type' => ['required_with:items', 'in:part,service'],
            'items.*.part_id' => ['nullable', 'exists:parts,id'],
            'items.*.service_id' => ['nullable', 'exists:services,id'],
            'items.*.description' => ['nullable', 'string'],
            'items.*.quantity' => ['required_with:items', 'numeric', 'min:0.01'],
            'items.*.unit_price' => ['required_with:items', 'numeric', 'min:0'],
            'items.*.discount' => ['nullable', 'numeric', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            // Update invoice fields
            $invoice->update($request->only([
                'customer_id',
                'yacht_id',
                'vehicle_id',
                'status',
                'issue_date',
                'due_date',
                'tax_rate',
                'notes'
            ]));

            // Update items if provided
            if ($request->has('items')) {
                // Delete existing items
                $invoice->items()->delete();

                // Create new items
                foreach ($request->items as $itemData) {
                    $item = $invoice->items()->create([
                        'item_type' => $itemData['item_type'],
                        'part_id' => $itemData['part_id'] ?? null,
                        'service_id' => $itemData['service_id'] ?? null,
                        'description' => $itemData['description'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'discount' => $itemData['discount'] ?? 0,
                        'total' => ($itemData['quantity'] * $itemData['unit_price']) - ($itemData['discount'] ?? 0),
                    ]);
                }
            }

            // Recalculate totals
            $invoice->calculateTotals();

            DB::commit();

            return response()->json([
                'message' => 'Invoice updated successfully',
                'invoice' => $invoice->fresh()->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service']),
                'id' => $invoice->id,
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Invoice update failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete invoice
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized. Only admins can delete invoices.'], 403);
        }

        $invoice = Invoice::findOrFail($id);
        
        // Check if invoice has payments
        if ($invoice->payments()->count() > 0) {
            return response()->json(['message' => 'Cannot delete invoice with payments. Delete payments first.'], 422);
        }

        $invoice->delete();

        return response()->json(['message' => 'Invoice deleted successfully'], 200);
    }
}

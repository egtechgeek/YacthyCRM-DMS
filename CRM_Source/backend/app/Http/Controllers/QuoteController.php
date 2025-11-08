<?php

namespace App\Http\Controllers;

use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Support\Branding;

class QuoteController extends Controller
{
    /**
     * Get all quotes
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Quote::with(['customer', 'yacht', 'vehicle', 'items']);

        // Customers can only see their own quotes
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

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('quote_number', 'like', "%{$search}%")
                  ->orWhereHas('customer', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['quote_number', 'created_at', 'expiration_date', 'total', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $quotes = $query->paginate(20);

        return response()->json($quotes, 200);
    }

    /**
     * Get single quote
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $quote = Quote::with(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])->findOrFail($id);

        // Customers can only see their own quotes
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $quote->customer_id !== $customer->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        return response()->json([
            'quote' => $quote,
            'branding' => Branding::get(),
        ], 200);
    }

    /**
     * Download quote as PDF
     */
    public function downloadPdf(Request $request, $id)
    {
        $user = $request->user();
        $quote = Quote::with(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])->findOrFail($id);

        // Customers can only download their own quotes
        if ($user->isCustomer()) {
            $customer = $user->customer;
            if (!$customer || $quote->customer_id !== $customer->id) {
                abort(403, 'Unauthorized');
            }
        }

        $pdf = Pdf::loadView('quotes.show', [
            'quote' => $quote,
            'branding' => Branding::get(),
        ]);
        
        return $pdf->download('quote_' . $quote->quote_number . '.pdf');
    }

    /**
     * Create new quote
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
            'expiration_date' => ['nullable', 'date'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.item_type' => ['required', 'in:part,service'],
            'items.*.part_id' => ['required_if:items.*.item_type,part', 'exists:parts,id'],
            'items.*.service_id' => ['required_if:items.*.item_type,service', 'exists:services,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
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
            $quote = Quote::create([
                'quote_number' => Quote::generateQuoteNumber(),
                'customer_id' => $request->customer_id,
                'yacht_id' => $request->yacht_id,
                'vehicle_id' => $request->vehicle_id,
                'status' => 'draft',
                'expiration_date' => $request->expiration_date,
                'tax_rate' => $request->tax_rate ?? 0,
                'notes' => $request->notes,
            ]);

            foreach ($request->items as $index => $itemData) {
                $item = new QuoteItem([
                    'quote_id' => $quote->id,
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

            $quote->calculateTotals();

            DB::commit();

            return response()->json([
                'message' => 'Quote created successfully',
                'quote' => $quote->fresh()->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update quote
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quote = Quote::findOrFail($id);

        // Only draft quotes can be updated
        if ($quote->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotes can be updated'], 422);
        }

        $validator = Validator::make($request->all(), [
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'yacht_id' => ['nullable', 'exists:yachts,id'],
            'vehicle_id' => ['nullable', 'exists:vehicles,id'],
            'status' => ['sometimes', 'in:draft,sent,accepted,rejected,expired'],
            'expiration_date' => ['nullable', 'date'],
            'tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $quote->update($request->all());
        $quote->calculateTotals();

        return response()->json([
            'message' => 'Quote updated successfully',
            'quote' => $quote->fresh()->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])
        ], 200);
    }

    /**
     * Convert quote to invoice
     */
    public function convertToInvoice($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quote = Quote::with(['items'])->findOrFail($id);

        if ($quote->status !== 'accepted') {
            return response()->json(['message' => 'Only accepted quotes can be converted to invoices'], 422);
        }

        DB::beginTransaction();
        try {
            $invoice = \App\Models\Invoice::create([
                'invoice_number' => \App\Models\Invoice::generateInvoiceNumber(),
                'quote_id' => $quote->id,
                'customer_id' => $quote->customer_id,
                'yacht_id' => $quote->yacht_id,
                'vehicle_id' => $quote->vehicle_id,
                'status' => 'draft',
                'issue_date' => now(),
                'due_date' => now()->addDays(30),
                'tax_rate' => $quote->tax_rate,
                'notes' => $quote->notes,
            ]);

            foreach ($quote->items as $quoteItem) {
                \App\Models\InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'item_type' => $quoteItem->item_type,
                    'part_id' => $quoteItem->part_id,
                    'service_id' => $quoteItem->service_id,
                    'description' => $quoteItem->description,
                    'quantity' => $quoteItem->quantity,
                    'unit_price' => $quoteItem->unit_price,
                    'discount' => $quoteItem->discount,
                    'sort_order' => $quoteItem->sort_order,
                ]);
            }

            $invoice->calculateTotals();

            DB::commit();

            return response()->json([
                'message' => 'Quote converted to invoice successfully',
                'invoice' => $invoice->fresh()->load(['customer', 'yacht', 'vehicle', 'items.part', 'items.service'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to convert quote',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete quote
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $quote = Quote::findOrFail($id);
        
        // Only draft quotes can be deleted
        if ($quote->status !== 'draft') {
            return response()->json(['message' => 'Only draft quotes can be deleted'], 422);
        }

        $quote->delete();

        return response()->json(['message' => 'Quote deleted successfully'], 200);
    }
}


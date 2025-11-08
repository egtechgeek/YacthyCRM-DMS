<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use App\Models\Invoice;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PaymentController extends Controller
{
    /**
     * Get all payments
     */
    public function index(Request $request)
    {
        $query = Payment::with(['invoice.customer', 'paymentMethod']);

        // Filter by invoice
        if ($request->has('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by provider
        if ($request->has('payment_provider')) {
            $query->where('payment_provider', $request->payment_provider);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('provider_transaction_id', 'like', "%{$search}%")
                  ->orWhereHas('invoice', function($q) use ($search) {
                      $q->where('invoice_number', 'like', "%{$search}%");
                  });
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'processed_at');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['processed_at', 'amount', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('processed_at', 'desc');
        }

        $payments = $query->paginate(20);

        return response()->json($payments, 200);
    }

    /**
     * Get single payment
     */
    public function show($id)
    {
        $payment = Payment::with(['invoice.customer', 'paymentMethod'])->findOrFail($id);
        return response()->json(['payment' => $payment], 200);
    }

    /**
     * Create offline payment (manual entry)
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'invoice_id' => ['required', 'exists:invoices,id'],
            'payment_method_id' => ['nullable', 'exists:payment_methods,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method_type' => ['required', 'string', 'in:cash,check,bank_transfer,credit_card,other'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $invoice = Invoice::findOrFail($request->invoice_id);

        // Check if payment amount exceeds balance
        if ($request->amount > $invoice->balance) {
            return response()->json([
                'message' => 'Payment amount cannot exceed invoice balance',
                'balance' => $invoice->balance
            ], 422);
        }

        $payment = Payment::create([
            'invoice_id' => $request->invoice_id,
            'payment_method_id' => $request->payment_method_id,
            'payment_provider' => 'offline',
            'amount' => $request->amount,
            'status' => 'completed',
            'payment_method_type' => $request->payment_method_type,
            'notes' => $request->notes,
            'processed_at' => now(),
        ]);

        $invoice->calculateTotals();

        return response()->json([
            'message' => 'Payment recorded successfully',
            'payment' => $payment->load(['invoice', 'paymentMethod'])
        ], 201);
    }

    /**
     * Update payment
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $payment = Payment::findOrFail($id);
        $oldAmount = $payment->amount;

        $validator = Validator::make($request->all(), [
            'amount' => ['sometimes', 'numeric', 'min:0.01'],
            'payment_method_type' => ['sometimes', 'string'],
            'processed_at' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:pending,completed,failed,refunded'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $payment->update($request->all());

        // Recalculate invoice totals if amount or status changed
        if ($payment->wasChanged('amount') || $payment->wasChanged('status')) {
            $invoice = $payment->invoice;
            $invoice->calculateTotals();
        }

        return response()->json([
            'message' => 'Payment updated successfully',
            'payment' => $payment->fresh()->load(['invoice', 'paymentMethod'])
        ], 200);
    }

    /**
     * Delete payment
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $payment = Payment::findOrFail($id);
        $invoice = $payment->invoice;
        
        // Store payment amount before deletion
        $paymentAmount = $payment->amount;
        
        // Delete payment
        $payment->delete();
        
        // Recalculate invoice totals (will restore balance)
        $invoice->calculateTotals();

        return response()->json([
            'message' => 'Payment deleted successfully. Invoice balance has been restored.',
            'restored_amount' => $paymentAmount
        ], 200);
    }

    /**
     * Get payment methods
     */
    public function paymentMethods()
    {
        $methods = PaymentMethod::where('active', true)->get();
        return response()->json(['payment_methods' => $methods], 200);
    }
}


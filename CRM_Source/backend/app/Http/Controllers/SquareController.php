<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\SquareService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SquareController extends Controller
{
    protected $squareService;

    public function __construct(SquareService $squareService)
    {
        $this->squareService = $squareService;
    }

    /**
     * Create payment
     */
    public function createPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => ['required', 'exists:invoices,id'],
            'source_id' => ['required', 'string'],
            'amount' => ['nullable', 'numeric', 'min:0.01'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $invoice = Invoice::findOrFail($request->invoice_id);

        try {
            $payment = $this->squareService->createPayment($invoice, $request->source_id, $request->amount);
            
            // Create payment record
            \App\Models\Payment::create([
                'invoice_id' => $invoice->id,
                'payment_provider' => 'square',
                'provider_transaction_id' => $payment->getId(),
                'amount' => $payment->getAmountMoney()->getAmount() / 100,
                'status' => $payment->getStatus() === 'COMPLETED' ? 'completed' : 'pending',
                'payment_method_type' => 'credit_card',
                'processed_at' => $payment->getStatus() === 'COMPLETED' ? now() : null,
            ]);

            $invoice->calculateTotals();

            return response()->json([
                'message' => 'Payment processed successfully',
                'payment' => $payment
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to process payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle Square webhook
     */
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('X-Square-Signature');

        try {
            $this->squareService->handleWebhook($payload, $signature);
            return response()->json(['received' => true], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}


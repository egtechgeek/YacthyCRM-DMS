<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\StripeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class StripeController extends Controller
{
    protected $stripeService;

    public function __construct(StripeService $stripeService)
    {
        $this->stripeService = $stripeService;
    }

    /**
     * Create payment intent
     */
    public function createPaymentIntent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'invoice_id' => ['required', 'exists:invoices,id'],
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
            $intent = $this->stripeService->createPaymentIntent($invoice, $request->amount);
            
            return response()->json([
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create payment intent',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Handle Stripe webhook
     */
    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        try {
            $this->stripeService->handleWebhook($payload, $signature);
            return response()->json(['received' => true], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}


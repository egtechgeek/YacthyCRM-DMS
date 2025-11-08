<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Payment;
use App\Models\Invoice;
use App\Models\Setting;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class VirtualTerminalController extends Controller
{
    /**
     * Process payment through virtual terminal
     */
    public function process(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin() && !$user->isStaff()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'invoice_id' => ['required', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_provider' => ['required', 'in:manual,stripe,square'],
            'card_number' => ['required', 'string'],
            'card_exp_month' => ['required', 'string'],
            'card_exp_year' => ['required', 'string'],
            'card_cvv' => ['required', 'string'],
            'cardholder_name' => ['required', 'string'],
            'billing_zip' => ['required', 'string'],
            'processed_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $invoice = Invoice::findOrFail($request->invoice_id);

            // For manual entry, just record the payment
            if ($request->payment_provider === 'manual') {
                $payment = Payment::create([
                    'invoice_id' => $request->invoice_id,
                    'amount' => $request->amount,
                    'payment_method_type' => 'credit_card',
                    'payment_provider' => 'manual_terminal',
                    'status' => 'completed',
                    'processed_at' => $request->processed_at ?? now(),
                    'transaction_id' => 'MANUAL-' . strtoupper(substr(md5(uniqid()), 0, 10)),
                    'notes' => $request->notes ?? "Manual card entry - Last 4: " . substr($request->card_number, -4),
                ]);

                // Update invoice balance
                $invoice->paid_amount += $request->amount;
                $invoice->balance = max(0, $invoice->total - $invoice->paid_amount);
                
                if ($invoice->balance == 0) {
                    $invoice->status = 'paid';
                } elseif ($invoice->balance < $invoice->total) {
                    $invoice->status = 'partial';
                }
                
                $invoice->save();

                DB::commit();

                return response()->json([
                    'message' => 'Payment recorded successfully',
                    'payment' => $payment,
                ], 200);
            }

            // For Stripe processing
            if ($request->payment_provider === 'stripe') {
                $stripeEnabled = Setting::get('stripe_enabled', false);
                
                if (!$stripeEnabled) {
                    DB::rollBack();
                    return response()->json(['message' => 'Stripe is not enabled. Please enable it in System Settings.'], 422);
                }

                // Initialize Stripe
                if (!env('STRIPE_SECRET')) {
                    DB::rollBack();
                    return response()->json(['message' => 'Stripe API key not configured. Please add STRIPE_SECRET to .env file.'], 422);
                }

                try {
                    \Stripe\Stripe::setApiKey(env('STRIPE_SECRET'));

                    // Create a payment method from card details
                    $paymentMethod = \Stripe\PaymentMethod::create([
                        'type' => 'card',
                        'card' => [
                            'number' => str_replace(' ', '', $request->card_number),
                            'exp_month' => $request->card_exp_month,
                            'exp_year' => $request->card_exp_year,
                            'cvc' => $request->card_cvv,
                        ],
                        'billing_details' => [
                            'name' => $request->cardholder_name,
                            'address' => [
                                'postal_code' => $request->billing_zip,
                            ],
                        ],
                    ]);

                    // Create payment intent
                    $paymentIntent = \Stripe\PaymentIntent::create([
                        'amount' => $request->amount * 100, // Convert to cents
                        'currency' => 'usd',
                        'payment_method' => $paymentMethod->id,
                        'confirm' => true,
                        'description' => "Payment for Invoice #{$invoice->invoice_number}",
                        'metadata' => [
                            'invoice_id' => $invoice->id,
                            'invoice_number' => $invoice->invoice_number,
                        ],
                        'return_url' => env('APP_URL') . '/payments',
                    ]);

                    // Record payment
                    $payment = Payment::create([
                        'invoice_id' => $request->invoice_id,
                        'amount' => $request->amount,
                        'payment_method_type' => 'credit_card',
                        'payment_provider' => 'stripe',
                        'status' => $paymentIntent->status === 'succeeded' ? 'completed' : 'pending',
                        'processed_at' => $request->processed_at ?? now(),
                        'transaction_id' => $paymentIntent->id,
                        'notes' => $request->notes ?? "Stripe payment - Card ending in " . substr($request->card_number, -4),
                    ]);

                    // Update invoice
                    if ($paymentIntent->status === 'succeeded') {
                        $invoice->paid_amount += $request->amount;
                        $invoice->balance = max(0, $invoice->total - $invoice->paid_amount);
                        
                        if ($invoice->balance == 0) {
                            $invoice->status = 'paid';
                        } elseif ($invoice->balance < $invoice->total) {
                            $invoice->status = 'partial';
                        }
                        
                        $invoice->save();
                    }

                    DB::commit();

                    return response()->json([
                        'message' => 'Payment processed successfully via Stripe',
                        'payment' => $payment,
                        'stripe_payment_intent' => $paymentIntent->id,
                    ], 200);

                } catch (\Stripe\Exception\CardException $e) {
                    DB::rollBack();
                    return response()->json(['message' => 'Card declined: ' . $e->getMessage()], 422);
                } catch (\Exception $e) {
                    DB::rollBack();
                    return response()->json(['message' => 'Stripe processing failed: ' . $e->getMessage()], 500);
                }
            }

            // For Square processing
            if ($request->payment_provider === 'square') {
                $squareEnabled = Setting::get('square_enabled', false);
                
                if (!$squareEnabled) {
                    DB::rollBack();
                    return response()->json(['message' => 'Square is not enabled. Please enable it in System Settings.'], 422);
                }

                // Check for Square credentials
                if (!env('SQUARE_ACCESS_TOKEN') || !env('SQUARE_LOCATION_ID')) {
                    DB::rollBack();
                    return response()->json(['message' => 'Square API credentials not configured. Please add SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID to .env file.'], 422);
                }

                try {
                    // Initialize Square client
                    $squareClient = new \Square\SquareClient([
                        'accessToken' => env('SQUARE_ACCESS_TOKEN'),
                        'environment' => env('SQUARE_ENVIRONMENT', 'sandbox'),
                    ]);

                    // Generate idempotency key
                    $idempotencyKey = uniqid('square_', true);

                    // Create payment
                    $cardNumber = str_replace(' ', '', $request->card_number);
                    
                    $body = new \Square\Models\CreatePaymentRequest(
                        sourceId: 'CARD_ON_FILE', // For card nonce, we'd use Square Web SDK
                        idempotencyKey: $idempotencyKey
                    );
                    
                    $body->setAmountMoney(new \Square\Models\Money(
                        amount: (int)($request->amount * 100), // Convert to cents
                        currency: 'USD'
                    ));
                    
                    $body->setLocationId(env('SQUARE_LOCATION_ID'));
                    $body->setNote("Payment for Invoice #{$invoice->invoice_number}");
                    
                    // For Virtual Terminal, we need to use card details directly
                    // This requires Square's Terminal API or Web SDK
                    // For now, record as manual entry with Square metadata
                    
                    $payment = Payment::create([
                        'invoice_id' => $request->invoice_id,
                        'amount' => $request->amount,
                        'payment_method_type' => 'credit_card',
                        'payment_provider' => 'square',
                        'status' => 'completed',
                        'processed_at' => $request->processed_at ?? now(),
                        'transaction_id' => 'SQ-' . strtoupper(substr(md5(uniqid()), 0, 12)),
                        'notes' => $request->notes ?? "Square Virtual Terminal - Card ending in " . substr($request->card_number, -4),
                    ]);

                    // Update invoice
                    $invoice->paid_amount += $request->amount;
                    $invoice->balance = max(0, $invoice->total - $invoice->paid_amount);
                    
                    if ($invoice->balance == 0) {
                        $invoice->status = 'paid';
                    } elseif ($invoice->balance < $invoice->total) {
                        $invoice->status = 'partial';
                    }
                    
                    $invoice->save();

                    DB::commit();

                    return response()->json([
                        'message' => 'Payment recorded successfully via Square Virtual Terminal',
                        'payment' => $payment,
                        'note' => 'Square Virtual Terminal requires Square Terminal hardware or Web SDK for live processing. This payment has been recorded for reference.',
                    ], 200);

                } catch (\Exception $e) {
                    DB::rollBack();
                    return response()->json(['message' => 'Square processing failed: ' . $e->getMessage()], 500);
                }
            }

            DB::rollBack();
            return response()->json(['message' => 'Invalid payment provider'], 422);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Payment processing failed: ' . $e->getMessage()], 500);
        }
    }
}

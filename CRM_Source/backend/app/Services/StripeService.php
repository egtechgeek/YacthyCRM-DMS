<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use Stripe\StripeClient;
use Stripe\Exception\ApiErrorException;

class StripeService
{
    protected $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    /**
     * Create payment intent for invoice
     */
    public function createPaymentIntent(Invoice $invoice, $amount = null)
    {
        $amount = $amount ?? $invoice->balance;
        $amountInCents = (int) ($amount * 100);

        try {
            $intent = $this->stripe->paymentIntents->create([
                'amount' => $amountInCents,
                'currency' => 'usd',
                'description' => "Payment for Invoice {$invoice->invoice_number}",
                'metadata' => [
                    'invoice_id' => $invoice->id,
                    'invoice_number' => $invoice->invoice_number,
                ],
            ]);

            return $intent;
        } catch (ApiErrorException $e) {
            throw new \Exception('Stripe error: ' . $e->getMessage());
        }
    }

    /**
     * Confirm payment intent
     */
    public function confirmPaymentIntent($paymentIntentId)
    {
        try {
            return $this->stripe->paymentIntents->retrieve($paymentIntentId);
        } catch (ApiErrorException $e) {
            throw new \Exception('Stripe error: ' . $e->getMessage());
        }
    }

    /**
     * Handle webhook
     */
    public function handleWebhook($payload, $signature)
    {
        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $signature,
                config('services.stripe.webhook_secret')
            );

            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $this->handlePaymentSucceeded($event->data->object);
                    break;
                case 'payment_intent.payment_failed':
                    $this->handlePaymentFailed($event->data->object);
                    break;
            }

            return true;
        } catch (\Exception $e) {
            throw new \Exception('Webhook error: ' . $e->getMessage());
        }
    }

    protected function handlePaymentSucceeded($paymentIntent)
    {
        $invoiceId = $paymentIntent->metadata->invoice_id ?? null;
        if (!$invoiceId) {
            return;
        }

        $invoice = Invoice::find($invoiceId);
        if (!$invoice) {
            return;
        }

        $payment = Payment::where('provider_transaction_id', $paymentIntent->id)->first();
        if (!$payment) {
            Payment::create([
                'invoice_id' => $invoice->id,
                'payment_provider' => 'stripe',
                'provider_transaction_id' => $paymentIntent->id,
                'amount' => $paymentIntent->amount / 100,
                'status' => 'completed',
                'payment_method_type' => 'credit_card',
                'processed_at' => now(),
            ]);

            $invoice->calculateTotals();
        }
    }

    protected function handlePaymentFailed($paymentIntent)
    {
        $payment = Payment::where('provider_transaction_id', $paymentIntent->id)->first();
        if ($payment) {
            $payment->update(['status' => 'failed']);
        }
    }
}


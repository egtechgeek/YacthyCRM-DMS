<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Payment;
use Square\SquareClient;
use Square\Exceptions\ApiException;

class SquareService
{
    protected $square;

    public function __construct()
    {
        $this->square = new SquareClient([
            'accessToken' => config('services.square.access_token'),
            'environment' => config('services.square.environment'),
        ]);
    }

    /**
     * Create payment for invoice
     */
    public function createPayment(Invoice $invoice, $sourceId, $amount = null)
    {
        $amount = $amount ?? $invoice->balance;
        $amountInCents = (int) ($amount * 100);

        try {
            $paymentsApi = $this->square->getPaymentsApi();
            
            $payment = $paymentsApi->createPayment([
                'source_id' => $sourceId,
                'amount_money' => [
                    'amount' => $amountInCents,
                    'currency' => 'USD',
                ],
                'idempotency_key' => uniqid('invoice_' . $invoice->id . '_'),
                'note' => "Payment for Invoice {$invoice->invoice_number}",
                'reference_id' => $invoice->invoice_number,
            ]);

            return $payment->getResult()->getPayment();
        } catch (ApiException $e) {
            throw new \Exception('Square error: ' . $e->getMessage());
        }
    }

    /**
     * Handle webhook
     */
    public function handleWebhook($payload, $signature)
    {
        // Square webhook handling
        // Implementation depends on Square webhook structure
        $data = json_decode($payload, true);

        if (isset($data['type']) && $data['type'] === 'payment.updated') {
            $this->handlePaymentUpdated($data['data']);
        }

        return true;
    }

    protected function handlePaymentUpdated($data)
    {
        $paymentId = $data['id'] ?? null;
        if (!$paymentId) {
            return;
        }

        $payment = Payment::where('provider_transaction_id', $paymentId)->first();
        if ($payment) {
            $status = $data['status'] ?? 'pending';
            $paymentStatus = $status === 'COMPLETED' ? 'completed' : 'pending';
            
            $payment->update([
                'status' => $paymentStatus,
                'processed_at' => $paymentStatus === 'completed' ? now() : null,
            ]);

            if ($paymentStatus === 'completed') {
                $payment->invoice->calculateTotals();
            }
        }
    }
}


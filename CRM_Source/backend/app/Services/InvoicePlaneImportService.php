<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class InvoicePlaneImportService
{
    /**
     * Import customers from InvoicePlane
     * Returns array with 'imported' customers and 'mapping' of old IP client_id to new customer_id
     */
    public function importCustomers($ipCustomers)
    {
        $imported = [];
        $errors = [];
        $mapping = [];

        DB::beginTransaction();
        try {
            foreach ($ipCustomers as $ipCustomer) {
                try {
                    // Handle both object and array formats
                    $ipClientId = is_object($ipCustomer) ? ($ipCustomer->client_id ?? null) : ($ipCustomer['client_id'] ?? null);
                    $name = is_object($ipCustomer) ? ($ipCustomer->client_name ?? $ipCustomer->client_surname ?? 'Unknown') : ($ipCustomer['client_name'] ?? $ipCustomer['client_surname'] ?? 'Unknown');
                    
                    $customer = Customer::create([
                        'name' => $name,
                        'email' => is_object($ipCustomer) ? ($ipCustomer->client_email ?? null) : ($ipCustomer['client_email'] ?? null),
                        'phone' => is_object($ipCustomer) ? ($ipCustomer->client_phone ?? null) : ($ipCustomer['client_phone'] ?? null),
                        'address' => is_object($ipCustomer) ? ($ipCustomer->client_address_1 ?? null) : ($ipCustomer['client_address_1'] ?? null),
                        'city' => is_object($ipCustomer) ? ($ipCustomer->client_city ?? null) : ($ipCustomer['client_city'] ?? null),
                        'state' => is_object($ipCustomer) ? ($ipCustomer->client_state ?? null) : ($ipCustomer['client_state'] ?? null),
                        'zip' => is_object($ipCustomer) ? ($ipCustomer->client_zip ?? null) : ($ipCustomer['client_zip'] ?? null),
                        'country' => is_object($ipCustomer) ? ($ipCustomer->client_country ?? null) : ($ipCustomer['client_country'] ?? null),
                        'notes' => is_object($ipCustomer) ? ($ipCustomer->client_notes ?? null) : ($ipCustomer['client_notes'] ?? null),
                    ]);

                    $imported[] = $customer;
                    
                    // Create mapping from InvoicePlane client_id to new customer_id
                    if ($ipClientId) {
                        $mapping[$ipClientId] = $customer->id;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'customer' => $ipCustomer,
                        'error' => $e->getMessage()
                    ];
                    Log::error('InvoicePlane customer import error: ' . $e->getMessage());
                }
            }

            DB::commit();
            return [
                'imported' => $imported, 
                'errors' => $errors,
                'mapping' => $mapping
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Import quotes from InvoicePlane
     */
    public function importQuotes($ipQuotes, $customerMapping = [])
    {
        $imported = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($ipQuotes as $ipQuote) {
                try {
                    $ipClientId = is_object($ipQuote) ? ($ipQuote->client_id ?? null) : ($ipQuote['client_id'] ?? null);
                    $customerId = $customerMapping[$ipClientId] ?? null;
                    if (!$customerId) {
                        $errors[] = ['quote' => $ipQuote, 'error' => 'Customer mapping not found for client_id: ' . $ipClientId];
                        continue;
                    }

                    $quote = Quote::create([
                        'quote_number' => is_object($ipQuote) ? ($ipQuote->quote_number_old ?? Quote::generateQuoteNumber()) : ($ipQuote['quote_number_old'] ?? Quote::generateQuoteNumber()),
                        'customer_id' => $customerId,
                        'status' => $this->mapQuoteStatus(is_object($ipQuote) ? ($ipQuote->quote_status_id ?? 1) : ($ipQuote['quote_status_id'] ?? 1)),
                        'expiration_date' => is_object($ipQuote) ? ($ipQuote->quote_date_expires ?? null) : ($ipQuote['quote_date_expires'] ?? null),
                        'subtotal' => is_object($ipQuote) ? ($ipQuote->quote_item_subtotal ?? 0) : ($ipQuote['quote_item_subtotal'] ?? 0),
                        'tax_rate' => is_object($ipQuote) ? ($ipQuote->quote_tax_rate_percent ?? 0) : ($ipQuote['quote_tax_rate_percent'] ?? 0),
                        'tax_amount' => is_object($ipQuote) ? ($ipQuote->quote_item_tax_total ?? 0) : ($ipQuote['quote_item_tax_total'] ?? 0),
                        'total' => is_object($ipQuote) ? ($ipQuote->quote_total ?? 0) : ($ipQuote['quote_total'] ?? 0),
                        'notes' => is_object($ipQuote) ? ($ipQuote->quote_terms ?? null) : ($ipQuote['quote_terms'] ?? null),
                    ]);

                    // Import quote items
                    $items = is_object($ipQuote) ? ($ipQuote->items ?? []) : ($ipQuote['items'] ?? []);
                    foreach ($items as $index => $ipItem) {
                        QuoteItem::create([
                            'quote_id' => $quote->id,
                            'item_type' => 'service', // Default to service
                            'description' => is_object($ipItem) ? ($ipItem->item_name ?? $ipItem->item_description ?? '') : ($ipItem['item_name'] ?? $ipItem['item_description'] ?? ''),
                            'quantity' => is_object($ipItem) ? ($ipItem->item_quantity ?? 1) : ($ipItem['item_quantity'] ?? 1),
                            'unit_price' => is_object($ipItem) ? ($ipItem->item_price ?? 0) : ($ipItem['item_price'] ?? 0),
                            'discount' => is_object($ipItem) ? ($ipItem->item_discount_amount ?? 0) : ($ipItem['item_discount_amount'] ?? 0),
                            'total' => is_object($ipItem) ? ($ipItem->item_subtotal ?? 0) : ($ipItem['item_subtotal'] ?? 0),
                            'sort_order' => $index,
                        ]);
                    }

                    $quote->calculateTotals();
                    $imported[] = $quote;
                } catch (\Exception $e) {
                    $errors[] = ['quote' => $ipQuote, 'error' => $e->getMessage()];
                    Log::error('InvoicePlane quote import error: ' . $e->getMessage());
                }
            }

            DB::commit();
            return ['imported' => $imported, 'errors' => $errors];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Import invoices from InvoicePlane
     */
    public function importInvoices($ipInvoices, $customerMapping = [])
    {
        $imported = [];
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($ipInvoices as $ipInvoice) {
                try {
                    $ipClientId = is_object($ipInvoice) ? ($ipInvoice->client_id ?? null) : ($ipInvoice['client_id'] ?? null);
                    $customerId = $customerMapping[$ipClientId] ?? null;
                    if (!$customerId) {
                        $errors[] = ['invoice' => $ipInvoice, 'error' => 'Customer mapping not found for client_id: ' . $ipClientId];
                        continue;
                    }

                    $invoice = Invoice::create([
                        'invoice_number' => is_object($ipInvoice) ? ($ipInvoice->invoice_number ?? Invoice::generateInvoiceNumber()) : ($ipInvoice['invoice_number'] ?? Invoice::generateInvoiceNumber()),
                        'customer_id' => $customerId,
                        'status' => $this->mapInvoiceStatus(is_object($ipInvoice) ? ($ipInvoice->invoice_status_id ?? 1) : ($ipInvoice['invoice_status_id'] ?? 1)),
                        'issue_date' => is_object($ipInvoice) ? ($ipInvoice->invoice_date_created ?? now()) : ($ipInvoice['invoice_date_created'] ?? now()),
                        'due_date' => is_object($ipInvoice) ? ($ipInvoice->invoice_date_due ?? now()->addDays(30)) : ($ipInvoice['invoice_date_due'] ?? now()->addDays(30)),
                        'subtotal' => is_object($ipInvoice) ? ($ipInvoice->invoice_item_subtotal ?? 0) : ($ipInvoice['invoice_item_subtotal'] ?? 0),
                        'tax_rate' => is_object($ipInvoice) ? ($ipInvoice->invoice_tax_rate_percent ?? 0) : ($ipInvoice['invoice_tax_rate_percent'] ?? 0),
                        'tax_amount' => is_object($ipInvoice) ? ($ipInvoice->invoice_item_tax_total ?? 0) : ($ipInvoice['invoice_item_tax_total'] ?? 0),
                        'total' => is_object($ipInvoice) ? ($ipInvoice->invoice_total ?? 0) : ($ipInvoice['invoice_total'] ?? 0),
                        'paid_amount' => is_object($ipInvoice) ? ($ipInvoice->invoice_paid ?? 0) : ($ipInvoice['invoice_paid'] ?? 0),
                        'balance' => (is_object($ipInvoice) ? ($ipInvoice->invoice_total ?? 0) : ($ipInvoice['invoice_total'] ?? 0)) - (is_object($ipInvoice) ? ($ipInvoice->invoice_paid ?? 0) : ($ipInvoice['invoice_paid'] ?? 0)),
                        'notes' => is_object($ipInvoice) ? ($ipInvoice->invoice_terms ?? null) : ($ipInvoice['invoice_terms'] ?? null),
                    ]);

                    // Import invoice items
                    $items = is_object($ipInvoice) ? ($ipInvoice->items ?? []) : ($ipInvoice['items'] ?? []);
                    foreach ($items as $index => $ipItem) {
                        InvoiceItem::create([
                            'invoice_id' => $invoice->id,
                            'item_type' => 'service', // Default to service
                            'description' => is_object($ipItem) ? ($ipItem->item_name ?? $ipItem->item_description ?? '') : ($ipItem['item_name'] ?? $ipItem['item_description'] ?? ''),
                            'quantity' => is_object($ipItem) ? ($ipItem->item_quantity ?? 1) : ($ipItem['item_quantity'] ?? 1),
                            'unit_price' => is_object($ipItem) ? ($ipItem->item_price ?? 0) : ($ipItem['item_price'] ?? 0),
                            'discount' => is_object($ipItem) ? ($ipItem->item_discount_amount ?? 0) : ($ipItem['item_discount_amount'] ?? 0),
                            'total' => is_object($ipItem) ? ($ipItem->item_subtotal ?? 0) : ($ipItem['item_subtotal'] ?? 0),
                            'sort_order' => $index,
                        ]);
                    }

                    $invoice->calculateTotals();
                    $imported[] = $invoice;
                } catch (\Exception $e) {
                    $errors[] = ['invoice' => $ipInvoice, 'error' => $e->getMessage()];
                    Log::error('InvoicePlane invoice import error: ' . $e->getMessage());
                }
            }

            DB::commit();
            return ['imported' => $imported, 'errors' => $errors];
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    protected function mapQuoteStatus($ipStatusId)
    {
        // InvoicePlane status IDs: 1=draft, 2=sent, 3=viewed, 4=approved, 5=rejected
        $mapping = [
            1 => 'draft',
            2 => 'sent',
            4 => 'accepted',
            5 => 'rejected',
        ];

        return $mapping[$ipStatusId] ?? 'draft';
    }

    protected function mapInvoiceStatus($ipStatusId)
    {
        // InvoicePlane status IDs: 1=draft, 2=sent, 3=viewed, 4=paid, 5=overdue
        $mapping = [
            1 => 'draft',
            2 => 'sent',
            4 => 'paid',
            5 => 'overdue',
        ];

        return $mapping[$ipStatusId] ?? 'draft';
    }
}


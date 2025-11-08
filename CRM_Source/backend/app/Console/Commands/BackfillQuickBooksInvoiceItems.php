<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Support\QuickBooksCsvParser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use Throwable;

class BackfillQuickBooksInvoiceItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'quickbooks:backfill-invoice-items
        {source : Absolute path to the QuickBooks sales detail CSV}
        {--summary= : Optional path to the QuickBooks invoices list CSV for creating missing invoices}
        {--invoice=* : Optional QuickBooks invoice numbers to limit processing}
        {--dry-run : Preview the changes without writing to the database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Populate InvoiceItem records using a QuickBooks sales detail export';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $path = (string) $this->argument('source');

        if ($path === '' || !is_readable($path)) {
            $this->error('The provided CSV path is not readable: ' . $path);
            return self::FAILURE;
        }

        $limitInvoices = collect($this->option('invoice'))
            ->filter()
            ->map(fn (string $value) => $this->formatInvoiceNumber($value))
            ->values();

        $summaryLookup = $this->buildSummaryLookup((string) $this->option('summary'));

        $grouped = [];

        foreach (QuickBooksCsvParser::iterate($path) as $row) {
            $type = Str::lower($row['type'] ?? '');

            if ($type !== 'invoice') {
                continue;
            }

            $quickBooksNumber = $row['num'] ?? null;

            if (!$quickBooksNumber) {
                continue;
            }

            $invoiceNumber = $this->formatInvoiceNumber($quickBooksNumber);

            if ($limitInvoices->isNotEmpty() && !$limitInvoices->contains($invoiceNumber)) {
                continue;
            }

            $grouped[$invoiceNumber][] = [
                'quickbooks_number' => $quickBooksNumber,
                'item' => $row['item'] ?? null,
                'memo' => $row['memo'] ?? null,
                'quantity' => $this->parseQuantity($row['qty'] ?? null),
                'unit_price' => $this->parseAmount($row['sales_price'] ?? null),
                'amount' => $this->parseAmount($row['amount'] ?? null),
            ];
        }

        if (empty($grouped)) {
            $this->warn('No invoice rows were found in the provided CSV.');
            return self::SUCCESS;
        }

        $totals = [
            'processed' => 0,
            'created' => 0,
            'updated' => 0,
            'skipped_missing_invoice' => 0,
            'zero_amount' => 0,
        ];

        $dryRun = (bool) $this->option('dry-run');

        DB::beginTransaction();

        try {
            foreach ($grouped as $invoiceNumber => $lines) {
                /** @var \App\Models\Invoice|null $invoice */
                $invoice = Invoice::where('invoice_number', $invoiceNumber)->first();

                if (!$invoice) {
                    $summary = $summaryLookup[$invoiceNumber] ?? null;

                    if (!$summary) {
                        $totals['skipped_missing_invoice']++;
                        $this->warn("Skipped {$invoiceNumber}: Invoice not found and no summary data available.");
                        continue;
                    }

                    if ($dryRun) {
                        $totals['created']++;
                        $totals['processed']++;
                        $this->info("{$invoiceNumber}: Would create invoice from summary data.");
                        // Skip creating line items in dry run since invoice does not exist.
                        continue;
                    }

                    $invoice = $this->createInvoiceFromSummary($invoiceNumber, $summary);

                    if (!$invoice) {
                        $totals['skipped_missing_invoice']++;
                        $this->warn("Skipped {$invoiceNumber}: Unable to create invoice from summary data.");
                        continue;
                    }

                    $totals['created']++;
                }

                $lineTotal = $this->calculateLineTotal($lines);

                if ($lineTotal <= 0) {
                    $totals['zero_amount']++;
                    $this->warn("{$invoiceNumber}: Detail rows total $0.00 — importing items without adjusting recorded totals.");
                }

                $totals['processed']++;

                if (!$dryRun) {
                    $invoice->items()->delete();
                }

                $sortOrder = 1;

                foreach ($lines as $line) {
                    $amount = $line['amount'];
                    $quantity = $line['quantity'] ?? 1.0;

                    if ($quantity <= 0) {
                        $quantity = 1.0;
                    }

                    $unitPrice = $line['unit_price'];

                    if (abs($unitPrice) <= 0 && $quantity !== 0) {
                        $unitPrice = $amount / $quantity;
                    }

                    $description = $this->resolveDescription($line['item'] ?? null, $line['memo'] ?? null, $sortOrder);

                    if (!$dryRun) {
                        InvoiceItem::create([
                            'invoice_id' => $invoice->id,
                            'item_type' => 'service',
                            'description' => $description,
                            'quantity' => (int) round($quantity),
                            'unit_price' => round($unitPrice, 2),
                            'discount' => 0,
                            'total' => round($amount, 2),
                            'sort_order' => $sortOrder,
                        ]);
                    }

                    $sortOrder++;
                }

                $updatedInvoice = $this->updateInvoiceTotals($invoice, $lineTotal, $dryRun);

                if ($updatedInvoice) {
                    $totals['updated']++;
                }

                $totals['processed']++;
            }

            if ($dryRun) {
                DB::rollBack();
            } else {
                DB::commit();
            }
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);
            $this->error('Failed to backfill invoice items: ' . $exception->getMessage());
            return self::FAILURE;
        }

        $this->info('Backfill complete');
        $this->line('Processed invoices: ' . $totals['processed']);
        $this->line('Invoices created : ' . $totals['created']);
        $this->line('Invoices updated : ' . $totals['updated']);
        $this->line('Missing invoices : ' . $totals['skipped_missing_invoice']);
        $this->line('Zero amount detail: ' . $totals['zero_amount']);

        if ($dryRun) {
            $this->comment('Dry run complete. No changes were written to the database.');
        }

        return self::SUCCESS;
    }

    /**
     * Calculate the aggregate line total for a set of detail rows.
     *
     * @param  array<int, array<string, mixed>>  $lines
     */
    protected function calculateLineTotal(array $lines): float
    {
        return round(collect($lines)->sum(fn ($line) => $line['amount']), 2);
    }

    /**
     * Update invoice totals to align with the imported line items.
     */
    protected function updateInvoiceTotals(Invoice $invoice, float $lineTotal, bool $dryRun): bool
    {
        $originalSubtotal = round($invoice->subtotal ?? 0, 2);
        $originalTotal = round($invoice->total ?? 0, 2);
        $originalTax = round($invoice->tax_amount ?? 0, 2);

        if ($lineTotal <= 0) {
            // Preserve the existing financial figures; only line items are synced.
            return false;
        }

        if ($originalTotal <= 0) {
            $originalTotal = $lineTotal;
        }

        $calculatedTax = round($originalTotal - $lineTotal, 2);

        if ($calculatedTax < 0 && abs($calculatedTax) <= 0.02) {
            $lineTotal = round($lineTotal + $calculatedTax, 2);
            $calculatedTax = 0.0;
        }

        if ($calculatedTax < 0) {
            // If the detail exceeds the recorded total we keep the detail subtotal and zero the tax.
            $originalTotal = $lineTotal;
            $calculatedTax = 0.0;
        }

        $taxRate = $lineTotal > 0 ? round(($calculatedTax / $lineTotal) * 100, 4) : 0.0;
        $newTotal = round($lineTotal + $calculatedTax, 2);

        $changes = [
            'subtotal' => $lineTotal,
            'tax_amount' => $calculatedTax,
            'tax_rate' => $taxRate,
            'total' => $newTotal,
            'balance' => round($newTotal - ($invoice->paid_amount ?? 0), 2),
        ];

        $hasChanges = $lineTotal !== $originalSubtotal || $newTotal !== $originalTotal || $calculatedTax !== $originalTax;

        if ($hasChanges && !$dryRun) {
            $invoice->fill($changes);
            $invoice->save();
        }

        return $hasChanges;
    }

    /**
     * Attempt to create a missing invoice using summary data.
     *
     * @param  array<string, mixed>  $summary
     */
    protected function createInvoiceFromSummary(string $invoiceNumber, array $summary): ?Invoice
    {
        $customerName = trim((string) ($summary['customer'] ?? ''));

        if ($customerName === '') {
            return null;
        }

        $customer = Customer::where('name', $customerName)->first();

        if (!$customer) {
            $customer = Customer::create([
                'name' => $customerName,
                'email' => null,
                'phone' => null,
            ]);
        }

        $issueDate = $this->parseDate($summary['date'] ?? null);
        $dueDate = $this->parseDate($summary['due_date'] ?? null) ?? $issueDate;

        $amount = $summary['amount'] ?? 0.0;
        $openBalance = $summary['open_balance'] ?? 0.0;

        $invoice = new Invoice();
        $invoice->invoice_number = $invoiceNumber;
        $invoice->customer_id = $customer->id;
        $invoice->issue_date = $issueDate;
        $invoice->due_date = $dueDate ?? $issueDate;
        $invoice->subtotal = $amount;
        $invoice->tax_amount = 0;
        $invoice->tax_rate = 0;
        $invoice->total = $amount;
        $invoice->paid_amount = max(0, $amount - $openBalance);
        $invoice->balance = $openBalance > 0 ? $openBalance : max(0, $amount - $invoice->paid_amount);
        $invoice->status = $this->determineStatus($invoice->due_date, $invoice->balance);
        $invoice->notes = null;
        $invoice->save();

        return $invoice;
    }

    /**
     * Build a lookup of invoice summary data keyed by formatted invoice number.
     */
    protected function buildSummaryLookup(?string $path): array
    {
        if (!$path) {
            return [];
        }

        if (!is_readable($path)) {
            $this->warn('Summary CSV not readable: ' . $path);
            return [];
        }

        $lookup = [];

        foreach (QuickBooksCsvParser::iterate($path) as $row) {
            $number = $row['num'] ?? null;

            if (!$number) {
                continue;
            }

            $invoiceNumber = $this->formatInvoiceNumber($number);
            $lookup[$invoiceNumber] = [
                'customer' => $row['customer'] ?? null,
                'date' => $row['date'] ?? null,
                'due_date' => $row['due_date'] ?? null,
                'amount' => $this->parseAmount($row['amount'] ?? null),
                'open_balance' => $this->parseAmount($row['open_balance'] ?? null),
            ];
        }

        return $lookup;
    }

    /**
     * Parse QuickBooks date strings safely.
     */
    protected function parseDate($value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable $exception) {
            report($exception);
            return null;
        }
    }

    /**
     * Determine invoice status based on QuickBooks rules.
     */
    protected function determineStatus(?Carbon $dueDate, float $balance): string
    {
        if ($balance <= 0.01) {
            return 'paid';
        }

        if ($dueDate && $dueDate->isPast()) {
            return 'overdue';
        }

        return 'sent';
    }

    /**
     * Format a QuickBooks invoice number using the same convention as the importer.
     */
    protected function formatInvoiceNumber(string $number): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9\\-]/', '', $number) ?? '');

        if ($clean === '') {
            $clean = strtoupper(substr(md5($number), 0, 10));
        }

        return 'QB-INV-' . $clean;
    }

    /**
     * Resolve a sensible description for an imported line item.
     */
    protected function resolveDescription(?string $item, ?string $memo, int $index): string
    {
        $parts = collect([$item, $memo])
            ->filter(fn ($value) => $value !== null && trim($value) !== '')
            ->map(fn ($value) => trim($value))
            ->take(2)
            ->values();

        if ($parts->isEmpty()) {
            return 'QuickBooks line item #' . $index;
        }

        return mb_substr($parts->implode(' - '), 0, 191);
    }

    /**
     * Parse a QuickBooks amount into a float.
     */
    protected function parseAmount($value): float
    {
        if ($value === null) {
            return 0.0;
        }

        $numeric = trim((string) $value);

        if ($numeric === '') {
            return 0.0;
        }

        $isNegative = false;

        if (Str::startsWith($numeric, '(') && Str::endsWith($numeric, ')')) {
            $isNegative = true;
            $numeric = substr($numeric, 1, -1);
        }

        $numeric = str_replace(['$', ',', ' '], '', $numeric);

        if ($numeric === '') {
            return 0.0;
        }

        $float = (float) $numeric;

        return $isNegative ? -1 * $float : $float;
    }

    /**
     * Parse a QuickBooks quantity value into a float.
     */
    protected function parseQuantity($value): ?float
    {
        if ($value === null) {
            return null;
        }

        $numeric = trim((string) $value);

        if ($numeric === '') {
            return null;
        }

        if (Str::startsWith($numeric, '(') && Str::endsWith($numeric, ')')) {
            $numeric = '-' . substr($numeric, 1, -1);
        }

        return (float) str_replace(',', '', $numeric);
    }
}


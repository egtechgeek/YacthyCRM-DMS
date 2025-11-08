<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\Bill;
use App\Models\BillItem;
use App\Models\BillPayment;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Part;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Payment;
use App\Models\Service;
use App\Models\Vendor;
use App\Models\GeneralLedgerEntry;
use App\Models\User;
use App\Support\QuickBooksCsvParser;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class QuickBooksImportController extends Controller
{
    /**
     * Import Chart of Accounts from QuickBooks CSV export.
     */
    public function importChartOfAccounts(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        $existingNumbers = ChartOfAccount::pluck('account_number')->all();
        $accountCache = [];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2; // account for header row

                try {
                    $accountName = $this->string($row, 'account');
                    $accountNumber = $this->normalizeAccountNumber($this->stringFrom($row, [
                        'account_number',
                        'account_num',
                        'acct_num',
                        'number',
                    ]));
                    $detailTypeLabel = $this->stringFrom($row, ['detail_type', 'detail', 'account_detail_type']);

                    if (!$accountName || strcasecmp($accountName, 'account') === 0 || Str::startsWith(Str::lower($accountName), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $typeInfo = $this->mapAccountType($this->string($row, 'type'), $detailTypeLabel);
                    $description = $this->string($row, 'description');
                    $balance = $this->amount($row['balance_total'] ?? $row['balance'] ?? null);

                    [$account, $created] = $this->ensureAccount(
                        $accountName,
                        $typeInfo,
                        $description,
                        $balance,
                        $accountNumber,
                        $accountCache,
                        $existingNumbers
                    );

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Chart of Accounts import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import customers from QuickBooks CSV export.
     */
    public function importCustomers(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $name = $this->string($row, 'customer');

                    if (!$name || strcasecmp($name, 'customer') === 0 || Str::startsWith(Str::lower($name), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $email = $this->stringFrom($row, ['main_email', 'email', 'e_mail', 'email_address', 'primary_email']);
                    $phone = $this->stringFrom($row, [
                        'main_phone',
                        'phone',
                        'primary_phone',
                        'phone_1',
                        'phone1',
                        'work_phone',
                        'mobile',
                        'mobile_phone',
                        'alt_phone',
                        'fax',
                    ]);

                    $billingAddress = $this->buildAddress($row, [
                        'bill_to_',
                        'bill_addr',
                        'billaddr',
                        'bill_address_',
                        'bill_address_line_',
                        'billing_address_',
                        'billing_address_line_',
                    ]);
                    $shippingAddress = $this->buildAddress($row, [
                        'ship_to_',
                        'ship_addr',
                        'shipaddr',
                        'ship_address_',
                        'ship_address_line_',
                        'shipping_address_',
                        'shipping_address_line_',
                    ]);

                    if (!$billingAddress) {
                        $billingAddress = $this->normalizeAddressString($this->stringFrom($row, [
                            'billing_address',
                            'bill_address',
                            'bill_to',
                            'bill_to_address',
                            'cust_address',
                        ]));
                    }

                    if (!$shippingAddress) {
                        $shippingAddress = $this->normalizeAddressString($this->stringFrom($row, [
                            'shipping_address',
                            'ship_address',
                            'ship_to',
                            'ship_to_address',
                        ]));
                    }

                    $billingLineForCity = $this->stringFrom($row, [
                        'bill_to_2',
                        'bill_addr2',
                        'billaddress2',
                        'bill_address_2',
                        'bill_address_line_2',
                        'billing_address_2',
                        'billing_address_line_2',
                    ]);
                    $shippingLineForCity = $this->stringFrom($row, [
                        'ship_to_2',
                        'ship_addr2',
                        'shipaddress2',
                        'ship_address_2',
                        'ship_address_line_2',
                        'shipping_address_2',
                        'shipping_address_line_2',
                    ]);

                    [$billingCity, $billingState, $billingZip] = $this->parseCityStateZip($billingLineForCity);
                    [$shippingCity, $shippingState, $shippingZip] = $this->parseCityStateZip($shippingLineForCity);

                    $billingCity ??= $this->stringFrom($row, ['bill_to_city', 'bill_city', 'billing_city', 'bill_address_city', 'billing_address_city']);
                    $billingState ??= $this->stringFrom($row, ['bill_to_state', 'bill_state', 'billing_state', 'bill_address_state', 'billing_address_state']);
                    $billingZip ??= $this->stringFrom($row, ['bill_to_zip', 'bill_zip', 'billing_zip', 'bill_postal_code', 'billing_postal_code', 'bill_address_postal_code', 'billing_address_postal_code']);

                    $shippingCity ??= $this->stringFrom($row, ['ship_to_city', 'ship_city', 'shipping_city', 'ship_address_city', 'shipping_address_city']);
                    $shippingState ??= $this->stringFrom($row, ['ship_to_state', 'ship_state', 'shipping_state', 'ship_address_state', 'shipping_address_state']);
                    $shippingZip ??= $this->stringFrom($row, ['ship_to_zip', 'ship_zip', 'shipping_zip', 'ship_postal_code', 'shipping_postal_code', 'ship_address_postal_code', 'shipping_address_postal_code']);

                    if (!$billingCity || !$billingState || !$billingZip) {
                        [$addrCity, $addrState, $addrZip] = $this->extractCityStateZipFromAddress($billingAddress);
                        $billingCity ??= $addrCity;
                        $billingState ??= $addrState;
                        $billingZip ??= $addrZip;
                    }

                    if (!$shippingCity || !$shippingState || !$shippingZip) {
                        [$addrCity, $addrState, $addrZip] = $this->extractCityStateZipFromAddress($shippingAddress);
                        $shippingCity ??= $addrCity;
                        $shippingState ??= $addrState;
                        $shippingZip ??= $addrZip;
                    }

                    $customerData = [
                        'name' => $name,
                        'email' => $email,
                        'phone' => $phone,
                        'address' => $shippingAddress ?? $billingAddress,
                        'city' => $shippingCity ?? $billingCity,
                        'state' => $shippingState ?? $billingState,
                        'zip' => $shippingZip ?? $billingZip,
                        'billing_address' => $billingAddress,
                        'billing_city' => $billingCity,
                        'billing_state' => $billingState,
                        'billing_zip' => $billingZip,
                    ];

                    [$customer, $created] = $this->upsertCustomer($customerData);

                    $notes = $this->buildCustomerNotes($row);

                    if ($notes) {
                        $customer->notes = $this->appendNotes($customer->notes, $notes, $created);
                        $customer->save();
                    }

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Customers import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import vendors from QuickBooks CSV export.
     */
    public function importVendors(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $vendorName = $this->string($row, 'vendor') ?? $this->string($row, 'company');

                    if (!$vendorName || Str::startsWith(Str::lower($vendorName), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $email = $this->stringFrom($row, ['main_email', 'email', 'e_mail', 'email_address', 'primary_email']);
                    $phone = $this->stringFrom($row, [
                        'main_phone',
                        'phone',
                        'primary_phone',
                        'phone_1',
                        'phone1',
                        'work_phone',
                        'mobile',
                        'mobile_phone',
                        'alt_phone',
                        'fax',
                    ]);

                    $billingAddress = $this->buildAddress($row, ['bill_to_', 'bill_addr', 'billaddr', 'bill_address', 'billing_address']);

                    $billingLineForCity = $this->stringFrom($row, ['bill_to_2', 'bill_addr2', 'billaddress2', 'bill_address_2', 'billing_address_2']);
                    [$billingCity, $billingState, $billingZip] = $this->parseCityStateZip($billingLineForCity);

                    $billingCity ??= $this->stringFrom($row, ['bill_to_city', 'bill_city', 'billing_city']);
                    $billingState ??= $this->stringFrom($row, ['bill_to_state', 'bill_state', 'billing_state']);
                    $billingZip ??= $this->stringFrom($row, ['bill_to_zip', 'bill_zip', 'billing_zip', 'bill_postal_code']);

                    $vendor = Vendor::firstOrNew(['vendor_name' => $vendorName]);

                    if ($email) {
                        $vendor->email = $email;
                    }

                    if (!$vendor->email) {
                        $vendor->email = $this->generatePlaceholderEmail($vendorName, Vendor::class);
                    }

                    $vendor->company_name = $this->string($row, 'company') ?? $vendor->company_name;
                    $vendor->contact_person = $this->string($row, 'primary_contact') ?? $vendor->contact_person;
                    $vendor->phone = $phone ?? $vendor->phone;
                    $vendor->address = $billingAddress ?? $vendor->address;
                    $vendor->city = $billingCity ?? $vendor->city;
                    $vendor->state = $billingState ?? $vendor->state;
                    $vendor->zip = $billingZip ?? $vendor->zip;
                    $vendor->is_active = true;

                    $notes = $this->buildVendorNotes($row);

                    if ($notes) {
                        $vendor->notes = $this->appendNotes($vendor->notes, $notes, !$vendor->exists);
                    }

                    $created = !$vendor->exists;
                    $vendor->save();

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Vendors import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import items (parts/services) from QuickBooks CSV export.
     */
    public function importItems(Request $request)
    {
        $file = $this->validateCsvRequest($request, [
            'import_as' => ['required', 'in:parts,services,both'],
        ]);

        $importAs = $request->input('import_as', 'both');

        $stats = [
            'parts_imported' => 0,
            'services_imported' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $sku = $this->string($row, 'item');
                    $description = $this->string($row, 'description');

                    if (!$sku && !$description) {
                        $stats['skipped']++;
                        continue;
                    }

                    $typeCategory = $this->categorizeItemType($this->string($row, 'type'));

                    if ($typeCategory === 'skip') {
                        $stats['skipped']++;
                        continue;
                    }

                    $cost = $this->amount($row['cost'] ?? null);
                    $price = $this->amount($row['price'] ?? null);
                    $quantity = (int) round($this->amount($row['quantity_on_hand'] ?? null));
                    $reorderPoint = (int) round($this->amount($row['reorder_pt_min'] ?? null));
                    $preferredVendor = $this->string($row, 'preferred_vendor');

                    if (!$sku) {
                        $sku = $this->generatePlaceholderSku($description ?? 'item');
                    }

                    if ($typeCategory === 'part') {
                        if (!in_array($importAs, ['parts', 'both'], true)) {
                            $stats['skipped']++;
                            continue;
                        }

                        $part = Part::firstOrNew(['sku' => $sku]);
                        $part->name = $description ?? $sku;
                        $part->description = $description ?? $part->description;
                        $part->cost = $cost ?? $part->cost ?? 0;
                        $part->price = $price ?? ($cost ?? $part->price ?? 0);
                        $part->stock_quantity = $quantity;
                        $part->min_stock_level = $reorderPoint;
                        $part->vendor_part_numbers = $preferredVendor ?? $part->vendor_part_numbers;
                        $part->active = true;
                        $part->save();

                        $stats['parts_imported']++;
                        continue;
                    }

                    if ($typeCategory === 'service') {
                        if (!in_array($importAs, ['services', 'both'], true)) {
                            $stats['skipped']++;
                            continue;
                        }

                        $serviceName = $description ?? $sku;
                        $service = Service::firstOrNew(['name' => $serviceName]);
                        $service->description = $description ?? $service->description;
                        $fallbackRate = $service->hourly_rate ?: 0;
                        $service->hourly_rate = $price ?? ($cost ?? $fallbackRate ?? 0);
                        $service->active = true;
                        $service->save();

                        $stats['services_imported']++;
                        continue;
                    }

                        $stats['skipped']++;
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Items import complete',
                'parts_imported' => $stats['parts_imported'],
                'services_imported' => $stats['services_imported'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import invoices (transactions) from QuickBooks CSV export.
     */
    public function importInvoices(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $customerName = $this->string($row, 'customer');
                    $quickBooksNumber = $this->stringFrom($row, ['num', 'invoice', 'txn_id']);

                    if (!$customerName || !$quickBooksNumber || Str::startsWith(Str::lower($customerName), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $issueDate = $this->parseDate($this->string($row, 'date'));
                    $dueDate = $this->parseDate($this->string($row, 'due_date')) ?? $issueDate;
                    $amount = $this->amount($row['amount'] ?? $row['total'] ?? null);
                    $openBalance = $this->amount($row['open_balance'] ?? $row['balance'] ?? null);
                    $aging = $this->string($row, 'aging');

                    $subtotal = $this->amount($row['subtotal'] ?? null);
                    $taxAmount = $this->amount($row['tax_amount'] ?? $row['sales_tax'] ?? $row['tax'] ?? null);
                    $taxRate = $this->percentage($this->stringFrom($row, ['tax_rate', 'sales_tax_rate', 'tax_percent']));
                    $taxName = $this->stringFrom($row, ['tax_item', 'sales_tax_item', 'tax_name', 'tax_code', 'sales_tax_code']);

                    if ($subtotal <= 0 && $amount > 0 && $taxAmount > 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    if ($taxRate === null && $subtotal > 0 && $taxAmount > 0) {
                        $taxRate = round(($taxAmount / $subtotal) * 100, 4);
                    }

                    if ($subtotal <= 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    if ($amount <= 0) {
                        $amount = $subtotal + $taxAmount;
                    }

                    [$customer] = $this->upsertCustomer(['name' => $customerName]);

                    $invoiceNumber = $this->formatInvoiceNumber($quickBooksNumber);

                    $invoice = Invoice::firstOrNew(['invoice_number' => $invoiceNumber]);
                    $created = !$invoice->exists;

                    $invoice->customer_id = $customer->id;
                    $invoice->issue_date = $issueDate;
                    $invoice->due_date = $dueDate ?? $issueDate;
                    $invoice->subtotal = $subtotal;
                    $invoice->tax_rate = $taxRate ?? 0;
                    $invoice->tax_amount = $taxAmount;
                    $invoice->tax_name = $taxName;
                    $invoice->total = $amount;
                    $invoice->paid_amount = max(0, $invoice->total - $openBalance);
                    $invoice->balance = $openBalance > 0 ? $openBalance : max(0, $invoice->total - $invoice->paid_amount);
                    $invoice->status = $this->determineInvoiceStatus($invoice->due_date, $invoice->balance, $invoice->paid_amount);

                    $note = $this->buildInvoiceNote($quickBooksNumber, $invoice->total, $invoice->balance, $aging, $taxAmount, $taxRate, $taxName);
                    $invoice->notes = $this->appendNotes($invoice->notes, $note, $created);

                    $invoice->save();

                    $this->syncInvoiceItem($invoice, $quickBooksNumber);

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Invoices import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import estimates (quotes) from QuickBooks CSV export.
     */
    public function importEstimates(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $customerName = $this->string($row, 'customer');
                    $quickBooksNumber = $this->string($row, 'num');

                    if (!$customerName || !$quickBooksNumber || Str::startsWith(Str::lower($customerName), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $issueDate = $this->parseDate($this->string($row, 'date'));
                    $amount = $this->amount($row['amount'] ?? null);
                    $openBalance = $this->amount($row['open_balance'] ?? null);
                    $subtotal = $this->amount($row['subtotal'] ?? null);
                    $taxAmount = $this->amount($row['tax_amount'] ?? $row['sales_tax'] ?? $row['tax'] ?? null);
                    $taxRate = $this->percentage($this->stringFrom($row, ['tax_rate', 'sales_tax_rate', 'tax_percent']));
                    $taxName = $this->stringFrom($row, ['tax_item', 'sales_tax_item', 'tax_name', 'tax_code', 'sales_tax_code']);
                    $isActive = $this->parseBoolean($this->string($row, 'active_estimate'));

                    if ($subtotal <= 0 && $amount > 0 && $taxAmount > 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    if ($taxRate === null && $subtotal > 0 && $taxAmount > 0) {
                        $taxRate = round(($taxAmount / $subtotal) * 100, 4);
                    }

                    if ($subtotal <= 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    [$customer] = $this->upsertCustomer(['name' => $customerName]);

                    $quoteNumber = $this->formatQuoteNumber($quickBooksNumber);

                    $quote = Quote::firstOrNew(['quote_number' => $quoteNumber]);
                    $created = !$quote->exists;

                    $quote->customer_id = $customer->id;
                    $quote->expiration_date = $issueDate ? $issueDate->copy()->addDays(30) : null;
                    $quote->subtotal = $subtotal > 0 ? $subtotal : $amount;
                    $quote->tax_rate = $taxRate ?? 0;
                    $quote->tax_amount = $taxAmount;
                    $quote->tax_name = $taxName;
                    $quote->total = $amount > 0 ? $amount : ($quote->subtotal + $taxAmount);
                    $quote->status = $this->determineQuoteStatus($openBalance, $isActive);

                    $note = $this->buildQuoteNote($quickBooksNumber, $quote->total, $openBalance, $isActive, $taxAmount, $taxRate, $taxName);
                    $quote->notes = $this->appendNotes($quote->notes, $note, $created);

                    $quote->save();

                    $this->syncQuoteItem($quote, $quickBooksNumber);

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Estimates import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Import bills (transactions) from QuickBooks CSV export.
     */
    public function importBills(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                try {
                    $vendorName = $this->stringFrom($row, ['vendor', 'supplier', 'payee', 'name']);

                    if (!$vendorName || Str::startsWith(Str::lower($vendorName), 'total')) {
                        $stats['skipped']++;
                        continue;
                    }

                    $quickBooksNumber = $this->stringFrom($row, ['num', 'bill', 'bill_number', 'ref_number', 'txn_id']);
                    $billDate = $this->parseDate($this->stringFrom($row, ['bill_date', 'date']));
                    $dueDate = $this->parseDate($this->stringFrom($row, ['due_date'])) ?? $billDate;

                    if (!$quickBooksNumber) {
                        $fallbackBase = Str::upper(substr(preg_replace('/[^A-Z0-9]/', '', Str::ascii($vendorName)) ?? 'QB', 0, 8));
                        $quickBooksNumber = $fallbackBase . '-' . ($billDate ? $billDate->format('Ymd') : strtoupper(substr(md5($vendorName . microtime()), 0, 6)));
                    }

                    $billNumber = $this->formatBillNumber($quickBooksNumber);

                    $amount = $this->amount($row['amount'] ?? $row['total'] ?? null);
                    $openBalance = $this->amount($row['open_balance'] ?? $row['balance'] ?? null);
                    $subtotal = $this->amount($row['subtotal'] ?? null);
                    $taxAmount = $this->amount($row['tax_amount'] ?? $row['sales_tax'] ?? $row['tax'] ?? null);
                    $taxRate = $this->percentage($this->stringFrom($row, ['tax_rate', 'sales_tax_rate', 'tax_percent']));
                    $taxName = $this->stringFrom($row, ['tax_item', 'sales_tax_item', 'tax_name', 'tax_code', 'sales_tax_code']);
                    $terms = $this->stringFrom($row, ['terms']);
                    $memo = $this->stringFrom($row, ['memo', 'description', 'note']);

                    if ($subtotal <= 0 && $amount > 0 && $taxAmount > 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    if ($taxRate === null && $subtotal > 0 && $taxAmount > 0) {
                        $taxRate = round(($taxAmount / $subtotal) * 100, 4);
                    }

                    if ($subtotal <= 0) {
                        $subtotal = max(0, $amount - $taxAmount);
                    }

                    if ($amount <= 0) {
                        $amount = $subtotal + $taxAmount;
                    }

                    $billingAddress = $this->buildAddress($row, ['bill_to_', 'bill_addr', 'billaddress', 'address', 'vendor_address']);
                    $billingLineForCity = $this->stringFrom($row, ['bill_to_2', 'bill_addr2', 'billaddress2', 'vendor_address_2']);
                    [$billingCity, $billingState, $billingZip] = $this->parseCityStateZip($billingLineForCity);

                    $vendorPayload = [
                        'vendor_name' => $vendorName,
                        'company_name' => $this->stringFrom($row, ['company']),
                        'contact_person' => $this->stringFrom($row, ['primary_contact', 'contact']),
                        'email' => $this->stringFrom($row, ['main_email', 'email']),
                        'phone' => $this->stringFrom($row, ['main_phone', 'phone', 'fax']),
                        'address' => $billingAddress,
                        'city' => $billingCity ?? $this->stringFrom($row, ['bill_to_city', 'city']),
                        'state' => $billingState ?? $this->stringFrom($row, ['bill_to_state', 'state']),
                        'zip' => $billingZip ?? $this->stringFrom($row, ['bill_to_zip', 'zip', 'postal_code']),
                        'payment_terms' => $terms,
                        'notes' => $this->buildVendorNotes($row),
                    ];

                    [$vendor] = $this->upsertVendor($vendorPayload);

                    $bill = Bill::firstOrNew(['bill_number' => $billNumber]);
                    $created = !$bill->exists;

                    $bill->vendor_id = $vendor->id;
                    $bill->bill_date = $billDate;
                    $bill->due_date = $dueDate ?? $billDate;
                    $bill->subtotal = $subtotal > 0 ? $subtotal : $amount;
                    $bill->tax = $taxAmount;
                    $bill->tax_name = $taxName;
                    $bill->total = $amount > 0 ? $amount : ($bill->subtotal + $taxAmount);
                    $bill->amount_paid = max(0, $bill->total - $openBalance);
                    $bill->balance = $openBalance > 0 ? $openBalance : max(0, $bill->total - $bill->amount_paid);
                    $bill->status = $this->determineBillStatus($bill->due_date, $bill->balance, $bill->amount_paid);
                    $bill->terms = $terms ?? $bill->terms;

                    $note = $this->buildBillNote($billNumber, $bill->total, $bill->balance, $terms, $taxAmount, $taxRate, $taxName);
                    $bill->memo = $this->appendNotes($bill->memo, $note, $created);

                    if ($memo) {
                        $bill->memo = $this->appendNotes($bill->memo, $memo, false);
                    }

                    $bill->save();

                    $this->syncBillItem($bill, $billNumber);

                    if ($created) {
                        $stats['created']++;
                    } else {
                        $stats['updated']++;
                    }
                } catch (Throwable $rowException) {
                    $stats['errors'][] = "Row {$rowNumber}: " . $rowException->getMessage();
                    $stats['skipped']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Bills import complete',
                'created' => $stats['created'],
                'updated' => $stats['updated'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    public function importVendorTransactions(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'bills_created' => 0,
            'bills_updated' => 0,
            'expenses_created' => 0,
            'payments_created' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        $path = $file instanceof UploadedFile ? $file->getRealPath() : (string) $file;

        if (!$path || !is_readable($path)) {
            throw new RuntimeException('Unable to access the QuickBooks CSV file.');
        }

        $rawHandle = fopen($path, 'r');

        if ($rawHandle === false) {
            throw new RuntimeException('Unable to open the QuickBooks CSV file for reading.');
        }

        $rawHeader = fgetcsv($rawHandle);
        if ($rawHeader === false) {
            fclose($rawHandle);
            throw new RuntimeException('The QuickBooks CSV file is missing a header row.');
        }

        $existingAccountNumbers = ChartOfAccount::pluck('account_number')->filter()->values()->all();
        $accountHierarchyCache = [];
        $accountLookupCache = [];

        $defaultPaymentUser = User::where('role', 'admin')->first() ?? User::first();

        if (!$defaultPaymentUser) {
            fclose($rawHandle);
            return response()->json([
                'message' => 'Import failed',
                'error' => 'Unable to locate a default user to attribute bill payments.',
                'errors' => [],
            ], 500);
        }

        $vendorCache = [];
        $vendorOpenBills = [];

        $currentVendor = null;
        $currentVendorName = null;

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;
                $rawRow = fgetcsv($rawHandle);

                if ($rawRow === false) {
                    break;
                }

                $firstColumn = $this->normalizeLooseValue($rawRow[0] ?? null);

                if ($this->isVendorHeaderRow($row, $firstColumn)) {
                    try {
                        [$currentVendor, $currentVendorName] = $this->resolveVendorFromHeader($firstColumn, $vendorCache);

                        if (!isset($vendorOpenBills[$currentVendor->id])) {
                            $vendorOpenBills[$currentVendor->id] = $this->initialVendorBillQueue($currentVendor);
                        }
                    } catch (Throwable $vendorException) {
                        $stats['errors'][] = "Row {$rowNumber}: " . $this->ensureUtf8($vendorException->getMessage());
                        $currentVendor = null;
                        $currentVendorName = null;
                    }

                    continue;
                }

                if (!$currentVendor) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row {$rowNumber}: Vendor context missing for transaction.";
                    continue;
                }

                $type = Str::lower($this->string($row, 'type') ?? '');
                if ($type === '') {
                    $stats['skipped']++;
                    continue;
                }

                $date = $this->parseDate($this->string($row, 'date'));
                $reference = $this->string($row, 'num');
                $memo = $this->string($row, 'memo');
                $accountLabel = $this->string($row, 'account');
                $splitLabel = $this->string($row, 'split');

                $credit = $this->amount($row['credit'] ?? null);
                $debit = $this->amount($row['debit'] ?? null);
                $amount = $credit > 0 ? $credit : ($debit > 0 ? $debit : 0);

                if ($amount <= 0) {
                    $stats['skipped']++;
                    continue;
                }

                $vendorId = $currentVendor->id;
                $queue =& $vendorOpenBills[$vendorId];

                switch ($type) {
                    case 'bill':
                        try {
                            [$bill, $created] = $this->createOrUpdateVendorBill(
                                $currentVendor,
                                $currentVendorName,
                                $row,
                                $amount,
                                $date,
                                $reference,
                                $memo,
                                $splitLabel,
                                $accountHierarchyCache,
                                $existingAccountNumbers,
                                $accountLookupCache
                            );

                            $queue[] = [
                                'bill' => $bill,
                                'remaining' => round($bill->balance, 2),
                            ];

                            if ($created) {
                                $stats['bills_created']++;
                            } else {
                                $stats['bills_updated']++;
                            }
                        } catch (Throwable $billException) {
                            $stats['errors'][] = "Row {$rowNumber}: " . $this->ensureUtf8($billException->getMessage());
                            $stats['skipped']++;
                        }

                        break;

                    case 'check':
                    case 'bill pmt -check':
                    case 'credit card':
                    case 'ccard':
                    case 'bill pmt -ccard':
                        try {
                            $bankAccount = $this->resolveBankAccountFromLabel($accountLabel, $accountHierarchyCache, $existingAccountNumbers, $accountLookupCache);
                            $applied = $this->applyVendorPayment(
                                $currentVendor,
                                $queue,
                                $amount,
                                $date,
                                $reference,
                                $memo,
                                $splitLabel,
                                $bankAccount,
                                $type,
                                $accountHierarchyCache,
                                $existingAccountNumbers,
                                $accountLookupCache,
                                $defaultPaymentUser->id,
                                $stats
                            );

                            if (!$applied) {
                                $stats['skipped']++;
                                $stats['errors'][] = "Row {$rowNumber}: Unable to apply payment for {$currentVendorName}.";
                            }
                        } catch (Throwable $paymentException) {
                            $stats['errors'][] = "Row {$rowNumber}: " . $this->ensureUtf8($paymentException->getMessage());
                            $stats['skipped']++;
                        }
                        break;

                    case 'deposit':
                    case 'bill pmt -credit card':
                    case 'purchase order':
                    case 'item receipt':
                    case 'general journal':
                        $stats['skipped']++;
                        $stats['errors'][] = "Row {$rowNumber}: Transaction type '{$type}' is not supported by the vendor import.";
                        break;

                    default:
                        $stats['skipped']++;
                        $stats['errors'][] = "Row {$rowNumber}: Unsupported transaction type '{$type}'.";
                        break;
                }
            }

            fclose($rawHandle);

            DB::commit();

            return response()->json([
                'message' => 'Vendor transactions import complete',
                'bills_created' => $stats['bills_created'],
                'bills_updated' => $stats['bills_updated'],
                'expenses_created' => $stats['expenses_created'],
                'payments_created' => $stats['payments_created'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            fclose($rawHandle);
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    public function importGeneralLedger(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'accounts_updated' => 0,
            'entries_created' => 0,
            'skipped_accounts' => 0,
            'errors' => [],
        ];

        $path = $file instanceof UploadedFile ? $file->getRealPath() : (string) $file;

        if (!$path || !is_readable($path)) {
            throw new RuntimeException('Unable to access the QuickBooks CSV file.');
        }

        $handle = fopen($path, 'r');

        if ($handle === false) {
            throw new RuntimeException('Unable to open the QuickBooks CSV file for reading.');
        }

        DB::beginTransaction();

        try {
            GeneralLedgerEntry::where('source', 'quickbooks')->delete();

            // Skip header row
            fgetcsv($handle);

            $currentAccountLabel = null;
            $currentAccount = null;
            $batch = [];
            $batchSize = 1000;

            while (($row = fgetcsv($handle)) !== false) {
                $labelRaw = $this->cleanLedgerValue($row[0] ?? null);

                if ($labelRaw !== null && $labelRaw !== '' && !Str::startsWith($labelRaw, 'Total')) {
                    $currentAccountLabel = $labelRaw;
                    $currentAccount = $this->findAccountByLedgerLabel($labelRaw);
                    continue;
                }

                if ($labelRaw !== null && Str::startsWith($labelRaw, 'Total')) {
                    if ($currentAccount) {
                        $balanceRaw = $row[9] ?? end($row);
                        $balance = $this->amount($balanceRaw);

                        $currentAccount->current_balance = $balance;
                        $currentAccount->save();
                        $stats['accounts_updated']++;
                    } else {
                        $stats['skipped_accounts']++;
                        $stats['errors'][] = "Skipped account total for '{$currentAccountLabel}' — account not found.";
                    }
                    continue;
                }

                $type = $this->cleanLedgerValue($row[1] ?? null);

                if (!$type || !$currentAccount) {
                    continue;
                }

                $date = $this->cleanLedgerValue($row[2] ?? null);
                $transactionDate = $this->parseDate($date);

                $transactionNumber = $this->cleanLedgerValue($row[3] ?? null);
                $name = $this->cleanLedgerValue($row[4] ?? null);
                $memo = $this->cleanLedgerValue($row[5] ?? null);
                $split = $this->cleanLedgerValue($row[6] ?? null);

                $debit = $this->amount($row[7] ?? null);
                $credit = $this->amount($row[8] ?? null);

                if (abs($debit) < 0.0001 && abs($credit) < 0.0001) {
                    continue;
                }

                $runningBalance = $this->amount($row[9] ?? null);

                $batch[] = [
                    'account_id' => $currentAccount?->id,
                    'account_name' => $currentAccount?->account_name ?? $this->normalizeAccountLabel($currentAccountLabel ?? ''),
                    'transaction_type' => $type,
                    'transaction_date' => $transactionDate ? $transactionDate->format('Y-m-d') : null,
                    'transaction_number' => $transactionNumber,
                    'name' => $name,
                    'memo' => $memo,
                    'split' => $split,
                    'debit' => $debit,
                    'credit' => $credit,
                    'running_balance' => $runningBalance,
                    'source' => 'quickbooks',
                    'external_reference' => $transactionNumber,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if (count($batch) >= $batchSize) {
                    GeneralLedgerEntry::insert($batch);
                    $stats['entries_created'] += count($batch);
                    $batch = [];
                }
            }

            if (!empty($batch)) {
                GeneralLedgerEntry::insert($batch);
                $stats['entries_created'] += count($batch);
            }

            fclose($handle);

            DB::commit();

            return response()->json([
                'message' => 'General ledger import complete',
                'created' => $stats['entries_created'],
                'updated' => $stats['accounts_updated'],
                'skipped' => $stats['skipped_accounts'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            if (is_resource($handle)) {
                fclose($handle);
            }

            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    public function importPayments(Request $request)
    {
        $file = $this->validateCsvRequest($request);

        $stats = [
            'created' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        $path = $file instanceof UploadedFile ? $file->getRealPath() : (string) $file;

        if (!$path || !is_readable($path)) {
            throw new RuntimeException('Unable to access the QuickBooks CSV file.');
        }

        $rawHandle = fopen($path, 'r');

        if ($rawHandle === false) {
            throw new RuntimeException('Unable to open the QuickBooks CSV file for reading.');
        }

        // Discard header row
        fgetcsv($rawHandle);

        $customerCache = [];
        $invoiceQueues = [];

        $currentCustomerName = null;
        $currentCustomer = null;

        DB::beginTransaction();

        try {
            foreach (QuickBooksCsvParser::iterate($file) as $index => $row) {
                $rowNumber = $index + 2;

                $rawRow = fgetcsv($rawHandle);
                if ($rawRow === false) {
                    break;
                }

                $maybeCustomer = $this->cleanQuickBooksValue($rawRow[0] ?? null);

                if ($maybeCustomer && !Str::startsWith(Str::lower($maybeCustomer), 'total')) {
                    $currentCustomerName = $maybeCustomer;

                    if (!array_key_exists($currentCustomerName, $customerCache)) {
                        $customerCache[$currentCustomerName] = $this->findCustomerByName($currentCustomerName);
                    }

                    $currentCustomer = $customerCache[$currentCustomerName];
                }

                $type = Str::lower($row['type'] ?? '');

                if ($type === '') {
                    continue;
                }

                if (!$currentCustomerName) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row {$rowNumber}: Unable to determine customer context for {$type} entry.";
                    continue;
                }

                if ($type === 'invoice') {
                    $quickBooksNumber = $this->string($row, 'num');

                    if (!$quickBooksNumber) {
                        continue;
                    }

                    $formattedNumber = $this->formatInvoiceNumber($quickBooksNumber);
                    $invoice = Invoice::where('invoice_number', $formattedNumber)->first();

                    if (!$invoice) {
                        $stats['skipped']++;
                        $stats['errors'][] = "Row {$rowNumber}: Invoice {$quickBooksNumber} not found for customer {$currentCustomerName}.";
                        continue;
                    }

                    if (!isset($invoiceQueues[$invoice->customer_id])) {
                        $invoiceQueues[$invoice->customer_id] = [];
                    }

                    if (!in_array($invoice->id, $invoiceQueues[$invoice->customer_id], true)) {
                        $invoiceQueues[$invoice->customer_id][] = $invoice->id;
                    }

                    continue;
                }

                if ($type !== 'payment') {
                    continue;
                }

                if (!$currentCustomer) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row {$rowNumber}: Customer {$currentCustomerName} was not found in the CRM. Payment skipped.";
                    continue;
                }

                $paymentAmount = abs($this->amount($row['debit'] ?? $row['amount'] ?? null));

                if ($paymentAmount <= 0) {
                    $stats['skipped']++;
                    continue;
                }

                if (!isset($invoiceQueues[$currentCustomer->id])) {
                    $invoiceQueues[$currentCustomer->id] = $this->buildInvoiceQueue($currentCustomer);
                }

                $processedAt = $this->parseDate($this->string($row, 'date')) ?? Carbon::now();
                $paymentNumber = $this->string($row, 'num');
                $memo = $this->string($row, 'memo');

                $remaining = $paymentAmount;
                $queue =& $invoiceQueues[$currentCustomer->id];
                $partIndex = 1;
                $baseProviderId = $this->buildQuickBooksPaymentReference($currentCustomerName, $paymentNumber, $processedAt, $paymentAmount, $rowNumber);

                while ($remaining > 0.01 && !empty($queue)) {
                    $invoiceId = $queue[0];
                    $invoice = Invoice::with('customer')->find($invoiceId);

                    if (!$invoice) {
                        array_shift($queue);
                        continue;
                    }

                    $invoice->refresh();
                    $outstanding = max($invoice->balance, 0);

                    if ($outstanding <= 0.01) {
                        array_shift($queue);
                        continue;
                    }

                    $applyAmount = min($outstanding, $remaining);

                    $providerId = $baseProviderId;
                    if ($partIndex > 1) {
                        $providerId .= '-PART' . $partIndex;
                    }

                    while (Payment::where('invoice_id', $invoice->id)->where('provider_transaction_id', $providerId)->exists()) {
                        $partIndex++;
                        $providerId = $baseProviderId . '-PART' . $partIndex;
                    }

                    if (Payment::where('invoice_id', $invoice->id)
                        ->whereDate('processed_at', $processedAt->format('Y-m-d'))
                        ->where('amount', $applyAmount)
                        ->exists()) {
                        $remaining -= $applyAmount;
                        if ($applyAmount >= $outstanding - 0.01) {
                            array_shift($queue);
                        }
                        continue;
                    }

                    $notesSegments = array_filter([
                        'Imported from QuickBooks payment data',
                        $paymentNumber ? 'QuickBooks payment #: ' . $paymentNumber : null,
                        $memo ? 'Memo: ' . $memo : null,
                    ]);

                    Payment::create([
                        'invoice_id' => $invoice->id,
                        'payment_method_id' => null,
                        'payment_provider' => 'offline',
                        'provider_transaction_id' => $providerId,
                        'amount' => $applyAmount,
                        'status' => 'completed',
                        'payment_method_type' => 'other',
                        'notes' => implode("\n", $notesSegments),
                        'processed_at' => $processedAt->toDateTimeString(),
                    ]);

                    $invoice->calculateTotals();
                    $stats['created']++;
                    $remaining -= $applyAmount;
                    $partIndex++;

                    $invoice->refresh();
                    if ($invoice->balance <= 0.01) {
                        array_shift($queue);
                    }
                }

                if ($remaining > 0.01) {
                    $stats['skipped']++;
                    $stats['errors'][] = "Row {$rowNumber}: Could not apply \$" . number_format($remaining, 2) . " of payment for {$currentCustomerName}.";
                }
            }

            fclose($rawHandle);
            DB::commit();

            return response()->json([
                'message' => 'Payments import complete',
                'created' => $stats['created'],
                'skipped' => $stats['skipped'],
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ]);
        } catch (Throwable $exception) {
            fclose($rawHandle);
            DB::rollBack();
            report($exception);

            return response()->json([
                'message' => 'Import failed',
                'error' => $this->ensureUtf8($exception->getMessage()),
                'errors' => array_map([$this, 'ensureUtf8'], $stats['errors']),
            ], 500);
        }
    }

    /**
     * Validate CSV upload request and return the uploaded file.
     */
    protected function validateCsvRequest(Request $request, array $rules = []): UploadedFile
    {
        $validator = Validator::make($request->all(), array_merge([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:20480'],
        ], $rules));

        $validator->validate();

        $file = $request->file('file');

        if (!$file instanceof UploadedFile) {
            throw new RuntimeException('Uploaded file is missing.');
        }

        return $file;
    }

    /**
     * Safely pull a trimmed string value from the parsed row.
     */
    protected function string(array $row, string $key): ?string
    {
        if (!array_key_exists($key, $row)) {
            return null;
        }

        $value = $row[$key];

        if ($value === null) {
            return null;
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * Parse monetary values that may include commas, currency symbols, or parentheses for negatives.
     */
    protected function amount($value): float
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

    protected function percentage(?string $value): ?float
    {
        if ($value === null) {
            return null;
        }

        $clean = trim(str_replace('%', '', $value));

        if ($clean === '') {
            return null;
        }

        $numeric = (float) $clean;

        if ($numeric === 0.0) {
            return 0.0;
        }

        if (abs($numeric) <= 1) {
            return $numeric * 100;
        }

        return $numeric;
    }

    /**
     * Parse QuickBooks date strings.
     */
    protected function parseDate(?string $value): ?Carbon
    {
        if (!$value) {
            return null;
        }

        $clean = preg_replace('/[^0-9\/-]/', '', $value) ?? $value;
        $formats = ['m/d/Y', 'm/d/y', 'Y-m-d'];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $clean);
            } catch (Throwable $ignored) {
                // Continue trying other formats
            }
        }

        try {
            return Carbon::parse($clean);
        } catch (Throwable $ignored) {
            return null;
        }
    }

    /**
     * Parse boolean-like values from QuickBooks CSV.
     */
    protected function parseBoolean(?string $value): bool
    {
        if ($value === null) {
            return false;
        }

        $normalized = Str::lower(trim($value));

        return in_array($normalized, ['x', 'yes', 'true', '1', 'active'], true);
    }

    protected function buildAddress(array $row, $prefixes): ?string
    {
        $prefixes = is_array($prefixes) ? $prefixes : [$prefixes];
        $matchedKeys = [];

        foreach (array_keys($row) as $key) {
            foreach ($prefixes as $prefix) {
                $normalizedPrefix = rtrim($prefix, '_');

                if (!Str::startsWith($key, $normalizedPrefix)) {
                    continue;
                }

                $remainder = substr($key, strlen($normalizedPrefix));
                $remainder = ltrim($remainder, '_');

                if ($remainder === '' || !ctype_digit($remainder)) {
                    continue;
                }

                $matchedKeys[$key] = true;
            }
        }

        if (empty($matchedKeys)) {
            return null;
        }

        $keys = array_keys($matchedKeys);
        natsort($keys);

        $lines = [];

        foreach ($keys as $key) {
            $value = $this->string($row, $key);

            if ($value !== null) {
                $lines[] = $value;
            }
        }

        return empty($lines) ? null : implode("\n", $lines);
    }

    protected function stringFrom(array $row, array $keys): ?string
    {
        foreach ($keys as $key) {
            $candidateKeys = [$key];

            if (str_contains($key, '_')) {
                $candidateKeys[] = preg_replace('/_(\d+)/', '$1', $key);
                $candidateKeys[] = str_replace('_', '', $key);
            }

            foreach (array_unique($candidateKeys) as $candidate) {
                $value = $this->string($row, $candidate);

                if ($value !== null) {
                    return $value;
                }
            }
        }

        return null;
    }

    protected function parseCityStateZip(?string $value): array
    {
        if (!$value) {
            return [null, null, null];
        }

        $clean = preg_replace('/\s+/', ' ', trim($value));

        if (preg_match('/^(.*?)[, ]+([A-Za-z]{2})\.?\s+([0-9\-]+)/', $clean, $matches)) {
            return [
                trim($matches[1]),
                strtoupper($matches[2]),
                $matches[3],
            ];
        }

        return [null, null, null];
    }

    protected function mapAccountType(?string $typeLabel, ?string $detailLabel = null): array
    {
        $key = Str::snake(Str::lower($typeLabel ?? ''));
        $detailKey = Str::snake(Str::lower($detailLabel ?? ''));

        $detailMapping = [
            'checking' => ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
            'savings' => ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
            'cash_on_hand' => ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
            'money_market' => ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
            'sales_tax_payable' => ['account_type' => 'liability', 'detail_type' => 'sales_tax_payable', 'is_bank' => false],
            'undeposited_funds' => ['account_type' => 'asset', 'detail_type' => 'undeposited_funds', 'is_bank' => true],
        ];

        if ($detailKey && isset($detailMapping[$detailKey])) {
            return array_merge(['is_bank' => false], $detailMapping[$detailKey]);
        }

        $mapping = [
            'bank' => ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
            'accounts_receivable' => ['account_type' => 'asset', 'detail_type' => 'accounts_receivable', 'is_bank' => false],
            'other_current_asset' => ['account_type' => 'asset', 'detail_type' => 'other_current_asset', 'is_bank' => false],
            'fixed_asset' => ['account_type' => 'asset', 'detail_type' => 'fixed_asset', 'is_bank' => false],
            'other_asset' => ['account_type' => 'asset', 'detail_type' => 'other_asset', 'is_bank' => false],
            'accounts_payable' => ['account_type' => 'liability', 'detail_type' => 'accounts_payable', 'is_bank' => false],
            'credit_card' => ['account_type' => 'liability', 'detail_type' => 'credit_card', 'is_bank' => false],
            'sales_tax_payable' => ['account_type' => 'liability', 'detail_type' => 'sales_tax_payable', 'is_bank' => false],
            'other_current_liability' => ['account_type' => 'liability', 'detail_type' => 'other_current_liability', 'is_bank' => false],
            'long_term_liability' => ['account_type' => 'liability', 'detail_type' => 'long_term_liability', 'is_bank' => false],
            'equity' => ['account_type' => 'equity', 'detail_type' => 'equity', 'is_bank' => false],
            'income' => ['account_type' => 'revenue', 'detail_type' => 'income', 'is_bank' => false],
            'sales_of_product_income' => ['account_type' => 'revenue', 'detail_type' => 'income', 'is_bank' => false],
            'service_fee_income' => ['account_type' => 'revenue', 'detail_type' => 'income', 'is_bank' => false],
            'other_income' => ['account_type' => 'other_income', 'detail_type' => 'other_income', 'is_bank' => false],
            'expense' => ['account_type' => 'expense', 'detail_type' => 'expense', 'is_bank' => false],
            'other_expense' => ['account_type' => 'other_expense', 'detail_type' => 'other_expense', 'is_bank' => false],
            'cost_of_goods_sold' => ['account_type' => 'cost_of_goods_sold', 'detail_type' => 'cost_of_goods_sold', 'is_bank' => false],
        ];

        return $mapping[$key] ?? ['account_type' => 'asset', 'detail_type' => 'other_asset', 'is_bank' => false];
    }

    protected function ensureAccount(
        string $fullName,
        array $typeInfo,
        ?string $description,
        float $balance,
        ?string $providedAccountNumber,
        array &$accountCache,
        array &$existingNumbers
    ): array {
        $segments = array_values(array_filter(array_map('trim', explode(':', $fullName)), static fn ($segment) => $segment !== ''));

        if (empty($segments)) {
            throw new RuntimeException('Account name is empty.');
        }

        $parentId = null;
        $pathSegments = [];
        $finalCreated = false;

        foreach ($segments as $index => $segment) {
            $isFinalSegment = $index === array_key_last($segments);
            $pathSegments[] = $segment;
            $cacheKey = ($parentId ?? 'root') . '|' . Str::lower($segment);

            if (isset($accountCache[$cacheKey])) {
                $account = $accountCache[$cacheKey];
            } else {
                $query = ChartOfAccount::where('account_name', $segment);
                $parentId ? $query->where('parent_id', $parentId) : $query->whereNull('parent_id');
                $account = $query->first();

                if (!$account) {
                    $assignedNumber = null;

                    if ($isFinalSegment && $providedAccountNumber && !in_array($providedAccountNumber, $existingNumbers, true)) {
                        $assignedNumber = $providedAccountNumber;
                        $existingNumbers[] = $assignedNumber;
                    }

                    if ($assignedNumber === null) {
                        $assignedNumber = $this->generateAccountNumber(implode(':', $pathSegments), $existingNumbers);
                    }

                    $account = ChartOfAccount::create([
                        'account_number' => $assignedNumber,
                        'account_name' => $segment,
                        'account_type' => $typeInfo['account_type'],
                        'detail_type' => $typeInfo['detail_type'],
                        'parent_id' => $parentId,
                        'is_active' => true,
                        'is_sub_account' => $parentId !== null,
                        'description' => $index === array_key_last($segments) ? $description : null,
                        'opening_balance' => $index === array_key_last($segments) ? $balance : 0,
                        'current_balance' => $index === array_key_last($segments) ? $balance : 0,
                    ]);

                    if ($index === array_key_last($segments)) {
                        $finalCreated = true;
                    }
                }

                $accountCache[$cacheKey] = $account;
            }

            if ($isFinalSegment) {
                if ($providedAccountNumber && $account->account_number !== $providedAccountNumber && !in_array($providedAccountNumber, $existingNumbers, true)) {
                    $account->account_number = $providedAccountNumber;
                    $existingNumbers[] = $providedAccountNumber;
                }

                $account->account_type = $typeInfo['account_type'];
                $account->detail_type = $typeInfo['detail_type'];
                $account->is_sub_account = $parentId !== null;
                $account->parent_id = $parentId;
                $account->opening_balance = $balance;
                $account->current_balance = $balance;

                if ($description !== null) {
                    $account->description = $description;
                }

                $account->save();

                if (!empty($typeInfo['is_bank'])) {
                    $this->syncBankAccount($account, $balance, $description, $providedAccountNumber);
                }
            } elseif ($account->parent_id !== $parentId) {
                $account->parent_id = $parentId;
                $account->is_sub_account = $parentId !== null;
                $account->save();
            }

            $parentId = $account->id;
        }

        return [$account, $finalCreated];
    }

    protected function generateAccountNumber(string $fullName, array &$existingNumbers): string
    {
        $base = Str::upper(preg_replace('/[^A-Z0-9]/', '', Str::ascii($fullName)) ?? '');

        if ($base === '') {
            $base = Str::upper(substr(md5($fullName), 0, 10));
        }

        $base = substr($base, 0, 10);

        if ($base === '') {
            $base = Str::upper(substr(md5(uniqid($fullName, true)), 0, 10));
        }

        $candidate = $base;
        $suffix = 1;

        while (in_array($candidate, $existingNumbers, true)) {
            $suffixStr = (string) $suffix;
            $candidate = substr($base, 0, 10 - strlen($suffixStr)) . $suffixStr;
            $suffix++;
        }

        $existingNumbers[] = $candidate;

        return $candidate;
    }

    protected function normalizeAccountNumber(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        return Str::upper(preg_replace('/\s+/', '', $trimmed));
    }

    protected function upsertCustomer(array $payload): array
    {
        $name = trim((string) ($payload['name'] ?? ''));

        if ($name === '') {
            throw new RuntimeException('Customer name is required.');
        }

        $email = $payload['email'] ?? null;

        $customer = Customer::whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();

        if (!$customer && $email) {
            $customer = Customer::whereRaw('LOWER(email) = ?', [Str::lower($email)])->first();
        }

        $created = false;

        if (!$customer) {
            $customer = new Customer();
            $customer->name = $name;
            $created = true;
        }

        if ($email) {
            $customer->email = $email;
        } elseif (!$customer->email || $this->isPlaceholderEmail($customer->email)) {
            $customer->email = $this->generatePlaceholderEmail($name, Customer::class);
        }

        foreach ([
            'phone',
            'address',
            'city',
            'state',
            'zip',
            'country',
            'billing_address',
            'billing_city',
            'billing_state',
            'billing_zip',
            'billing_country',
        ] as $field) {
            if (!empty($payload[$field])) {
                $customer->{$field} = $payload[$field];
            }
        }

        $customer->save();

        return [$customer, $created];
    }

    protected function upsertVendor(array $payload): array
    {
        $name = trim((string) ($payload['vendor_name'] ?? ''));

        if ($name === '') {
            throw new RuntimeException('Vendor name is required.');
        }

        $email = $payload['email'] ?? null;

        $vendor = Vendor::whereRaw('LOWER(vendor_name) = ?', [Str::lower($name)])->first();

        if (!$vendor && $email) {
            $vendor = Vendor::whereRaw('LOWER(email) = ?', [Str::lower($email)])->first();
        }

        $created = false;

        if (!$vendor) {
            $vendor = new Vendor();
            $vendor->vendor_name = $name;
            $created = true;
        }

        if ($email) {
            $vendor->email = $email;
        } elseif (!$vendor->email || $this->isPlaceholderEmail($vendor->email)) {
            $vendor->email = $this->generatePlaceholderEmail($name, Vendor::class);
        }

        foreach ([
            'company_name',
            'contact_person',
            'phone',
            'address',
            'city',
            'state',
            'zip',
            'country',
            'payment_terms',
            'tax_id',
        ] as $field) {
            if (!empty($payload[$field])) {
                $vendor->{$field} = $payload[$field];
            }
        }

        if (!empty($payload['notes'])) {
            $vendor->notes = $this->appendNotes($vendor->notes, $payload['notes'], $created);
        }

        $vendor->is_active = true;

        $vendor->save();

        return [$vendor, $created];
    }

    protected function isPlaceholderEmail(?string $email): bool
    {
        if (!$email) {
            return true;
        }

        return Str::endsWith(Str::lower($email), '@import.local');
    }

    protected function generatePlaceholderEmail(string $name, string $modelClass): string
    {
        $base = 'qb-' . substr(md5(Str::lower($name)), 0, 8);
        $email = $base . '@import.local';
        $suffix = 1;

        while ($modelClass::where('email', $email)->exists()) {
            $email = $base . $suffix . '@import.local';
            $suffix++;
        }

        return $email;
    }

    protected function appendNotes(?string $existing, string $note, bool $replace = false): string
    {
        if ($replace || !$existing) {
            return $note;
        }

        if (Str::contains($existing, $note)) {
            return $existing;
        }

        return $existing . "\n\n" . $note;
    }

    protected function generatePlaceholderSku(string $seed): string
    {
        return 'QB-' . strtoupper(substr(md5($seed), 0, 8));
    }

    protected function categorizeItemType(?string $typeLabel): string
    {
        $type = Str::lower(trim($typeLabel ?? ''));

        if ($type === '') {
            return 'service';
        }

        $skipTypes = [
            'subtotal',
            'group',
            'discount',
            'payment',
            'sales tax item',
            'sales tax group',
            'sales tax',
        ];

        if (in_array($type, $skipTypes, true) || Str::contains($type, ['subtotal', 'group', 'discount', 'payment', 'sales tax'])) {
            return 'skip';
        }

        $serviceTypes = [
            'service',
            'other charge',
        ];

        if (in_array($type, $serviceTypes, true) || Str::contains($type, ['service', 'charge', 'labor'])) {
            return 'service';
        }

        $partTypes = [
            'inventory part',
            'inventory assembly',
            'assembly',
            'non-inventory part',
        ];

        if (in_array($type, $partTypes, true) || Str::contains($type, ['inventory', 'part'])) {
            return 'part';
        }

        return 'service';
    }

    protected function determineInvoiceStatus(?Carbon $dueDate, float $balance, float $paidAmount): string
    {
        if ($balance <= 0.01) {
            return 'paid';
        }

        $isOverdue = $dueDate && $dueDate->isPast();

        if ($isOverdue) {
            return 'overdue';
        }

        return 'sent';
    }

    protected function determineQuoteStatus(float $openBalance, bool $isActive): string
    {
        if ($openBalance <= 0.01) {
            return 'accepted';
        }

        return $isActive ? 'sent' : 'expired';
    }

    protected function determineBillStatus(?Carbon $dueDate, float $balance, float $amountPaid): string
    {
        if ($balance <= 0.01) {
            return 'paid';
        }

        if ($amountPaid > 0.01) {
            return 'partial';
        }

        if ($dueDate && $dueDate->isPast()) {
            return 'overdue';
        }

        return 'unpaid';
    }

    protected function syncInvoiceItem(Invoice $invoice, string $quickBooksNumber): void
    {
        $description = 'Imported from QuickBooks invoice #' . $quickBooksNumber;

        InvoiceItem::updateOrCreate(
            [
                'invoice_id' => $invoice->id,
                'description' => $description,
            ],
            [
                'item_type' => 'service',
                'quantity' => 1,
                'unit_price' => $invoice->subtotal ?: $invoice->total,
                'discount' => 0,
                'total' => $invoice->subtotal ?: $invoice->total,
                'sort_order' => 1,
            ]
        );
    }

    protected function syncQuoteItem(Quote $quote, string $quickBooksNumber): void
    {
        $description = 'Imported from QuickBooks estimate #' . $quickBooksNumber;

        QuoteItem::updateOrCreate(
            [
                'quote_id' => $quote->id,
                'description' => $description,
            ],
            [
                'item_type' => 'service',
                'quantity' => 1,
                'unit_price' => $quote->subtotal ?: $quote->total,
                'discount' => 0,
                'total' => $quote->total,
                'sort_order' => 1,
            ]
        );
    }

    protected function syncBillItem(Bill $bill, string $quickBooksNumber): void
    {
        $description = 'Imported from QuickBooks bill #' . $quickBooksNumber;

        BillItem::updateOrCreate(
            [
                'bill_id' => $bill->id,
                'description' => $description,
            ],
            [
                'account_id' => null,
                'quantity' => 1,
                'rate' => $bill->subtotal ?: $bill->total,
                'amount' => $bill->subtotal ?: $bill->total,
            ]
        );
    }

    protected function normalizeLooseValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim((string) $value);
        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $clean) ?? $clean;

        if ($clean === '') {
            return null;
        }

        if (!mb_detect_encoding($clean, 'UTF-8', true)) {
            $clean = mb_convert_encoding($clean, 'UTF-8', 'ISO-8859-1');
        } else {
            $clean = mb_convert_encoding($clean, 'UTF-8', 'UTF-8');
        }

        $clean = trim($clean);

        return $clean === '' ? null : $clean;
    }

    protected function isVendorHeaderRow(array $row, ?string $firstColumn): bool
    {
        if ($firstColumn === null) {
            return false;
        }

        if (!empty(array_filter($row, static fn ($value) => $value !== null))) {
            return false;
        }

        return true;
    }

    protected function resolveVendorFromHeader(string $headerName, array &$cache): array
    {
        $normalized = Str::lower($headerName);

        if (isset($cache[$normalized])) {
            return [$cache[$normalized], $headerName];
        }

        [$vendor] = $this->upsertVendor([
            'vendor_name' => $headerName,
            'company_name' => $headerName,
        ]);

        $cache[$normalized] = $vendor;

        return [$vendor, $headerName];
    }

    protected function initialVendorBillQueue(Vendor $vendor): array
    {
        return $vendor->bills()
            ->where('balance', '>', 0.01)
            ->orderBy('bill_date')
            ->get()
            ->map(static function (Bill $bill) {
                return [
                    'bill' => $bill,
                    'remaining' => round($bill->balance, 2),
                ];
            })
            ->values()
            ->all();
    }

    protected function createOrUpdateVendorBill(
        Vendor $vendor,
        string $vendorName,
        array $row,
        float $amount,
        ?Carbon $date,
        ?string $reference,
        ?string $memo,
        ?string $splitLabel,
        array &$accountHierarchyCache,
        array &$existingAccountNumbers,
        array &$accountLookupCache
    ): array {
        $identifierParts = [
            'BILL',
            $vendorName,
            $reference ?: '',
            $date ? $date->format('Ymd') : '00000000',
            number_format($amount, 2, '.', ''),
            substr(md5(($splitLabel ?? '') . ($memo ?? '')), 0, 8),
        ];

        $identifier = implode('-', array_filter($identifierParts));
        $billNumber = $this->formatBillNumber($identifier);

        $bill = Bill::firstOrNew(['bill_number' => $billNumber]);
        $created = !$bill->exists;

        $bill->vendor_id = $vendor->id;
        $bill->bill_date = $date ? $date->format('Y-m-d') : now()->format('Y-m-d');
        $bill->due_date = $bill->bill_date;
        $bill->ref_number = $reference;
        $bill->subtotal = $amount;
        $bill->tax = 0;
        $bill->tax_name = null;
        $bill->total = $amount;

        if ($created || $bill->amount_paid <= 0.01) {
            $bill->amount_paid = $bill->amount_paid ?? 0;
            $bill->balance = max(0, $bill->total - $bill->amount_paid);
        }

        $note = 'Imported from QuickBooks vendor transactions.';
        $bill->memo = $this->appendNotes($bill->memo, $note, $created);

        if ($memo) {
            $bill->memo = $this->appendNotes($bill->memo, $memo, false);
        }

        $bill->save();

        $descriptionBase = $memo ?: ($splitLabel ? $this->normalizeAccountLabel($splitLabel) : 'Imported expense');
        $description = 'QB Vendor Import: ' . $descriptionBase;

        $expenseAccount = $this->resolveExpenseAccount(
            $splitLabel,
            $accountHierarchyCache,
            $existingAccountNumbers,
            $accountLookupCache
        );

        BillItem::updateOrCreate(
            [
                'bill_id' => $bill->id,
                'description' => $description,
            ],
            [
                'account_id' => $expenseAccount?->id,
                'quantity' => 1,
                'rate' => $amount,
                'amount' => $amount,
            ]
        );

        $bill->refresh();

        return [$bill, $created];
    }

    protected function resolveExpenseAccount(
        ?string $label,
        array &$accountHierarchyCache,
        array &$existingAccountNumbers,
        array &$accountLookupCache
    ): ?ChartOfAccount {
        if (!$label) {
            return null;
        }

        $cacheKey = 'expense|' . Str::lower($label);

        if (isset($accountLookupCache[$cacheKey])) {
            return $accountLookupCache[$cacheKey];
        }

        $account = $this->findAccountByLedgerLabel($label);

        if (!$account) {
            $normalized = $this->normalizeAccountLabel($label);

            if ($normalized !== '') {
                [$account] = $this->ensureAccount(
                    $normalized,
                    ['account_type' => 'expense', 'detail_type' => 'expense', 'is_bank' => false],
                    null,
                    0,
                    null,
                    $accountHierarchyCache,
                    $existingAccountNumbers
                );
            }
        }

        $accountLookupCache[$cacheKey] = $account;

        return $account;
    }

    protected function resolveBankAccountFromLabel(
        ?string $label,
        array &$accountHierarchyCache,
        array &$existingAccountNumbers,
        array &$accountLookupCache
    ): ?BankAccount {
        if (!$label) {
            return null;
        }

        $cacheKey = 'bank|' . Str::lower($label);

        if (isset($accountLookupCache[$cacheKey])) {
            return $accountLookupCache[$cacheKey];
        }

        $account = $this->findAccountByLedgerLabel($label);

        if (!$account) {
            $normalized = $this->normalizeAccountLabel($label);

            if ($normalized !== '') {
                [$account] = $this->ensureAccount(
                    $normalized,
                    ['account_type' => 'asset', 'detail_type' => 'bank', 'is_bank' => true],
                    null,
                    0,
                    null,
                    $accountHierarchyCache,
                    $existingAccountNumbers
                );
            }
        }

        if (!$account) {
            $accountLookupCache[$cacheKey] = null;
            return null;
        }

        $bankAccount = BankAccount::firstOrNew(['chart_account_id' => $account->id]);

        if (!$bankAccount->exists) {
            $bankAccount->account_name = $account->account_name;
            $bankAccount->is_active = true;
            $bankAccount->current_balance = 0;
            $bankAccount->opening_balance = 0;
            $bankAccount->save();
        }

        $accountLookupCache[$cacheKey] = $bankAccount;

        return $bankAccount;
    }

    protected function applyVendorPayment(
        Vendor $vendor,
        array &$queue,
        float $amount,
        ?Carbon $date,
        ?string $reference,
        ?string $memo,
        ?string $splitLabel,
        ?BankAccount $bankAccount,
        string $type,
        array &$accountHierarchyCache,
        array &$existingAccountNumbers,
        array &$accountLookupCache,
        int $defaultUserId,
        array &$stats
    ): bool {
        $remaining = round($amount, 2);
        $attempts = 0;

        while ($remaining > 0 && $attempts < 1000) {
            $attempts++;

            if (empty($queue)) {
                [$expenseBill] = $this->createOrUpdateVendorBill(
                    $vendor,
                    $vendor->vendor_name,
                    [],
                    $remaining,
                    $date,
                    $reference ? 'EXP-' . $reference : null,
                    $memo,
                    $splitLabel,
                    $accountHierarchyCache,
                    $existingAccountNumbers,
                    $accountLookupCache
                );

                $stats['expenses_created']++;

                $queue[] = [
                    'bill' => $expenseBill,
                    'remaining' => round($expenseBill->balance, 2),
                ];
            }

            if (empty($queue)) {
                break;
            }

            $entry = &$queue[0];
            $bill = $entry['bill']->fresh();
            $billRemaining = round($bill->balance, 2);

            if ($billRemaining <= 0.01) {
                array_shift($queue);
                continue;
            }

            $toApply = min($billRemaining, $remaining);

            $payment = new BillPayment([
                'bill_id' => $bill->id,
                'bank_account_id' => $bankAccount?->id,
                'payment_date' => $date ? $date->format('Y-m-d') : now()->format('Y-m-d'),
                'amount' => $toApply,
                'payment_method' => Str::contains($type, 'check') ? 'check' : 'ach',
                'check_number' => $reference,
                'reference' => $reference,
                'memo' => $memo,
                'created_by' => $defaultUserId,
            ]);

            $payment->save();

            $stats['payments_created']++;

            $bill->updateStatus();

            $remaining = round($remaining - $toApply, 2);
            $entry['bill'] = $bill->fresh();
            $entry['remaining'] = round($entry['bill']->balance, 2);

            if ($entry['remaining'] <= 0.01) {
                array_shift($queue);
            }
        }

        return $amount > 0 && $remaining < round($amount, 2);
    }

    protected function normalizeAddressString(?string $value): ?string
    {
        if (!$value) {
            return null;
        }

        $normalized = preg_replace("/\r\n|\r|\n/", "\n", trim($value));
        $normalized = preg_replace('/\n{2,}/', "\n", $normalized ?? '');

        return $normalized !== '' ? $normalized : null;
    }

    protected function cleanLedgerValue(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim(str_replace('"', '', $value));

        if ($clean === '' || $clean === '--') {
            return null;
        }

        return $clean;
    }

    protected function normalizeAccountLabel(string $label): string
    {
        $label = $this->cleanLedgerValue($label) ?? '';

        if ($label === '') {
            return $label;
        }

        if (Str::startsWith(Str::lower($label), 'total ')) {
            $label = trim(substr($label, 6));
        }

        return trim(preg_replace('/\s*\(([^()]*)\)\s*$/', '', $label) ?? $label);
    }

    protected function findAccountByLedgerLabel(string $label): ?ChartOfAccount
    {
        $normalized = $this->normalizeAccountLabel($label);

        if ($normalized === '') {
            return null;
        }

        $account = ChartOfAccount::whereRaw('LOWER(account_name) = ?', [Str::lower($normalized)])->first();

        if ($account) {
            return $account;
        }

        $fallback = Str::of($normalized)->replace('...', '')->replace('  ', ' ')->trim();

        if ($fallback !== $normalized && $fallback !== '') {
            $account = ChartOfAccount::whereRaw('LOWER(account_name) = ?', [Str::lower((string) $fallback)])->first();
            if ($account) {
                return $account;
            }
        }

        return null;
    }

    protected function extractCityStateZipFromAddress(?string $address): array
    {
        if (!$address) {
            return [null, null, null];
        }

        $lines = array_filter(array_map('trim', explode("\n", $address)));

        if (empty($lines)) {
            return [null, null, null];
        }

        $candidate = end($lines);

        return $this->parseCityStateZip($candidate);
    }

    protected function buildCustomerNotes(array $row): ?string
    {
        $segments = array_filter([
            'Imported from QuickBooks on ' . now()->toDateTimeString(),
            $this->string($row, 'company') ? 'Company: ' . $this->string($row, 'company') : null,
            $this->string($row, 'primary_contact') ? 'Primary contact: ' . $this->string($row, 'primary_contact') : null,
            $this->string($row, 'terms') ? 'Terms: ' . $this->string($row, 'terms') : null,
            $this->string($row, 'customer_type') ? 'Customer type: ' . $this->string($row, 'customer_type') : null,
            $this->string($row, 'rep') ? 'Rep: ' . $this->string($row, 'rep') : null,
            $this->string($row, 'sales_tax_code') ? 'Sales tax code: ' . $this->string($row, 'sales_tax_code') : null,
            $this->string($row, 'tax_item') ? 'Tax item: ' . $this->string($row, 'tax_item') : null,
            $this->string($row, 'resale_num') ? 'Resale #: ' . $this->string($row, 'resale_num') : null,
        ]);

        return empty($segments) ? null : implode("\n", $segments);
    }

    protected function buildVendorNotes(array $row): ?string
    {
        $segments = array_filter([
            'Imported from QuickBooks on ' . now()->toDateTimeString(),
            $this->string($row, 'company') ? 'Company: ' . $this->string($row, 'company') : null,
            $this->string($row, 'primary_contact') ? 'Primary contact: ' . $this->string($row, 'primary_contact') : null,
            $this->string($row, 'terms') ? 'Terms: ' . $this->string($row, 'terms') : null,
            $this->string($row, 'tax_id') ? 'Tax ID: ' . $this->string($row, 'tax_id') : null,
        ]);

        return empty($segments) ? null : implode("\n", $segments);
    }

    protected function buildInvoiceNote(string $qbNumber, float $amount, float $openBalance, ?string $aging, ?float $taxAmount, ?float $taxRate, ?string $taxName): string
    {
        $lines = [
            'Imported from QuickBooks invoice #' . $qbNumber,
            'Original amount: ' . number_format($amount, 2),
            'Open balance: ' . number_format($openBalance, 2),
        ];

        if ($aging !== null) {
            $lines[] = 'Aging: ' . $aging;
        }

        if ($taxAmount !== null) {
            $lines[] = 'Tax amount: ' . number_format($taxAmount, 2);
        }

        if ($taxRate !== null) {
            $lines[] = 'Tax rate: ' . number_format($taxRate, 2) . '%';
        }

        if ($taxName !== null) {
            $lines[] = 'Tax name: ' . $taxName;
        }

        $lines[] = 'Imported on ' . now()->toDateTimeString();

        return implode("\n", $lines);
    }

    protected function buildQuoteNote(string $qbNumber, float $amount, float $openBalance, bool $isActive, ?float $taxAmount, ?float $taxRate, ?string $taxName): string
    {
        $lines = [
            'Imported from QuickBooks estimate #' . $qbNumber,
            'Amount: ' . number_format($amount, 2),
            'Open balance: ' . number_format($openBalance, 2),
            'Active estimate: ' . ($isActive ? 'Yes' : 'No'),
            'Imported on ' . now()->toDateTimeString(),
        ];

        if ($taxAmount !== null) {
            $lines[] = 'Tax amount: ' . number_format($taxAmount, 2);
        }

        if ($taxRate !== null) {
            $lines[] = 'Tax rate: ' . number_format($taxRate, 2) . '%';
        }

        if ($taxName !== null) {
            $lines[] = 'Tax name: ' . $taxName;
        }

        return implode("\n", $lines);
    }

    protected function buildBillNote(string $qbNumber, float $amount, float $openBalance, ?string $terms, ?float $taxAmount, ?float $taxRate, ?string $taxName): string
    {
        $lines = [
            'Imported from QuickBooks bill #' . $qbNumber,
            'Total amount: ' . number_format($amount, 2),
            'Balance: ' . number_format($openBalance, 2),
        ];

        if ($terms) {
            $lines[] = 'Terms: ' . $terms;
        }

        if ($taxAmount !== null) {
            $lines[] = 'Tax amount: ' . number_format($taxAmount, 2);
        }

        if ($taxRate !== null) {
            $lines[] = 'Tax rate: ' . number_format($taxRate, 2) . '%';
        }

        if ($taxName !== null) {
            $lines[] = 'Tax name: ' . $taxName;
        }

        $lines[] = 'Imported on ' . now()->toDateTimeString();

        return implode("\n", $lines);
    }

    protected function buildInvoiceQueue(Customer $customer): array
    {
        return Invoice::where('customer_id', $customer->id)
            ->orderBy('issue_date')
            ->orderBy('created_at')
            ->pluck('id')
            ->all();
    }

    protected function buildQuickBooksPaymentReference(string $customerName, ?string $paymentNumber, Carbon $processedAt, float $amount, int $rowNumber): string
    {
        $base = $paymentNumber
            ? Str::slug($paymentNumber, '-')
            : Str::slug($customerName, '-');

        if ($base === '') {
            $base = 'payment-' . $rowNumber . '-' . number_format($amount, 2, '', '');
        }

        return 'QB-PMT-' . Str::upper($base) . '-' . $processedAt->format('Ymd');
    }

    protected function cleanQuickBooksValue($value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = trim((string) $value);
        $clean = preg_replace('/^\xEF\xBB\xBF/', '', $clean) ?? $clean;

        if ($clean === '') {
            return null;
        }

        if (!mb_detect_encoding($clean, 'UTF-8', true)) {
            $clean = mb_convert_encoding($clean, 'UTF-8', 'ISO-8859-1');
        } else {
            $clean = mb_convert_encoding($clean, 'UTF-8', 'UTF-8');
        }

        return $clean === '' ? null : $clean;
    }

    protected function findCustomerByName(string $name): ?Customer
    {
        return Customer::whereRaw('LOWER(name) = ?', [Str::lower($name)])->first();
    }

    protected function formatInvoiceNumber(string $number): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9\-]/', '', $number) ?? '');

        if ($clean === '') {
            $clean = strtoupper(substr(md5($number), 0, 10));
        }

        return 'QB-INV-' . $clean;
    }

    protected function formatQuoteNumber(string $number): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9\-]/', '', $number) ?? '');

        if ($clean === '') {
            $clean = strtoupper(substr(md5($number), 0, 10));
        }

        return 'QB-EST-' . $clean;
    }

    protected function formatBillNumber(string $number): string
    {
        $clean = strtoupper(preg_replace('/[^A-Z0-9\-]/', '', $number) ?? '');

        if ($clean === '') {
            $clean = strtoupper(substr(md5($number), 0, 10));
        }

        return 'QB-BILL-' . $clean;
    }

    protected function ensureUtf8(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!mb_detect_encoding($value, 'UTF-8', true)) {
            return mb_convert_encoding($value, 'UTF-8', 'ISO-8859-1');
        }

        return mb_convert_encoding($value, 'UTF-8', 'UTF-8');
    }

    protected function syncBankAccount(ChartOfAccount $account, float $balance, ?string $description, ?string $providedAccountNumber): void
    {
        $bankAccount = BankAccount::firstOrNew(['chart_account_id' => $account->id]);

        if (!$bankAccount->exists) {
            $bankAccount->account_name = $account->account_name;
            $bankAccount->is_active = true;
        }

        if ($providedAccountNumber) {
            $bankAccount->account_number = $providedAccountNumber;
        }

        if ($description && !$bankAccount->notes) {
            $bankAccount->notes = $description;
        }

        $bankAccount->opening_balance = $balance;
        $bankAccount->current_balance = $balance;
        $bankAccount->save();
    }
}

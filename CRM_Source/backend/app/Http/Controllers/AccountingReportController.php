<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\Bill;
use App\Models\ChartOfAccount;
use App\Models\Invoice;
use App\Models\GeneralLedgerEntry;
use Illuminate\Http\Request;
use App\Support\Branding;
use Carbon\Carbon;

class AccountingReportController extends Controller
{
    public function summary(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        if (!$startDate) {
            $startDate = Carbon::now()->startOfYear()->format('Y-m-d');
        }

        if (!$endDate) {
            $endDate = Carbon::now()->format('Y-m-d');
        }

        $incomeAccounts = ChartOfAccount::whereIn('account_type', ['revenue', 'other_income'])->get();
        $expenseAccounts = ChartOfAccount::whereIn('account_type', ['expense', 'other_expense', 'cost_of_goods_sold'])->get();
        $assetAccounts = ChartOfAccount::where('account_type', 'asset')->get();
        $liabilityAccounts = ChartOfAccount::where('account_type', 'liability')->get();
        $equityAccounts = ChartOfAccount::where('account_type', 'equity')->get();

        $ledgerTotalsForPeriod = $this->buildLedgerTotals($endDate, $startDate);
        $ledgerTotalsAsOf = $this->buildLedgerTotals($endDate);

        $totalIncome = $incomeAccounts->sum(function (ChartOfAccount $account) use ($ledgerTotalsForPeriod) {
            return $this->calculateAccountPeriodAmount($account, $ledgerTotalsForPeriod);
        });

        $totalExpenses = $expenseAccounts->sum(function (ChartOfAccount $account) use ($ledgerTotalsForPeriod) {
            return $this->calculateAccountPeriodAmount($account, $ledgerTotalsForPeriod);
        });

        if (abs($totalIncome) < 0.01 && abs($totalExpenses) < 0.01) {
            $totalIncome = Invoice::where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('issue_date', [$startDate, $endDate])
                          ->orWhere(function ($inner) use ($startDate, $endDate) {
                              $inner->whereNull('issue_date')
                                    ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);
                          });
                })
                ->sum('subtotal');

            $totalExpenses = Bill::whereBetween('bill_date', [$startDate, $endDate])->sum('subtotal');
        }

        $assetTotal = $assetAccounts->sum(function (ChartOfAccount $account) use ($ledgerTotalsAsOf, $endDate) {
            return $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $endDate);
        });

        $liabilityTotal = $liabilityAccounts->sum(function (ChartOfAccount $account) use ($ledgerTotalsAsOf, $endDate) {
            return $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $endDate);
        });

        $equityTotal = $equityAccounts->sum(function (ChartOfAccount $account) use ($ledgerTotalsAsOf, $endDate) {
            return $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $endDate);
        });

        $salesTaxAccount = ChartOfAccount::where('detail_type', 'sales_tax_payable')->first();
        $salesTaxLiability = $salesTaxAccount
            ? $this->calculateAccountBalance($salesTaxAccount, $ledgerTotalsAsOf, $endDate)
            : 0.0;

        $invoices = Invoice::where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('issue_date', [$startDate, $endDate])
                      ->orWhere(function ($inner) use ($startDate, $endDate) {
                          $inner->whereNull('issue_date')
                                ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);
                      });
            })
            ->get();

        $bills = Bill::whereBetween('bill_date', [$startDate, $endDate])->get();

        $salesTaxCollected = $invoices->whereIn('status', ['paid', 'partial'])->sum('tax_amount');
        $salesTaxOutstanding = $invoices->whereNotIn('status', ['paid', 'cancelled'])->sum('tax_amount');
        $purchaseTaxPaid = $bills->whereIn('status', ['paid', 'partial'])->sum('tax');

        if (abs($salesTaxLiability) < 0.01) {
            $salesTaxLiability = ($salesTaxCollected + $salesTaxOutstanding) - $purchaseTaxPaid;
        }

        $bankTotal = BankAccount::where('is_active', true)->sum('current_balance');

        return response()->json([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_assets' => $assetTotal,
            'total_liabilities' => $liabilityTotal,
            'total_equity' => $equityTotal,
            'total_income' => $totalIncome,
            'total_expenses' => $totalExpenses,
            'net_income' => $totalIncome - $totalExpenses,
            'bank_balance' => $bankTotal,
            'bank_accounts' => BankAccount::count(),
            'sales_tax_collected' => $salesTaxCollected,
            'sales_tax_outstanding' => $salesTaxOutstanding,
            'purchase_tax_paid' => $purchaseTaxPaid,
            'sales_tax_liability_balance' => $salesTaxLiability,
            'net_tax_liability' => ($salesTaxCollected + $salesTaxOutstanding) - $purchaseTaxPaid,
            'branding' => Branding::get(),
            'generated_at' => Carbon::now()->toDateTimeString(),
        ]);
    }

    public function profitAndLoss(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfYear()->format('Y-m-d'));
        $endDate = $request->get('end_date', now()->format('Y-m-d'));

        $ledgerTotalsForPeriod = $this->buildLedgerTotals($endDate, $startDate);

        $income = ChartOfAccount::whereIn('account_type', ['revenue', 'other_income'])
            ->get()
            ->map(function ($account) use ($ledgerTotalsForPeriod) {
                $amount = $this->calculateAccountPeriodAmount($account, $ledgerTotalsForPeriod);
                if (abs($amount) < 0.01) {
                    return null;
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'amount' => $amount,
                ];
            })
            ->filter()
            ->values();

        $expenses = ChartOfAccount::whereIn('account_type', ['expense', 'other_expense', 'cost_of_goods_sold'])
            ->get()
            ->map(function ($account) use ($ledgerTotalsForPeriod) {
                $amount = $this->calculateAccountPeriodAmount($account, $ledgerTotalsForPeriod);
                if (abs($amount) < 0.01) {
                    return null;
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'amount' => $amount,
                ];
            })
            ->filter()
            ->values();

        $totalIncome = $income->sum('amount');
        $totalExpenses = $expenses->sum('amount');

        if ($income->isEmpty() && $expenses->isEmpty()) {
            $invoices = Invoice::where(function ($query) use ($startDate, $endDate) {
                    $query->whereBetween('issue_date', [$startDate, $endDate])
                          ->orWhere(function ($inner) use ($startDate, $endDate) {
                              $inner->whereNull('issue_date')
                                    ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);
                          });
                })
                ->get();

            $bills = Bill::whereBetween('bill_date', [$startDate, $endDate])->get();

            $invoiceTotal = round($invoices->sum('subtotal'), 2);
            $billTotal = round($bills->sum('subtotal'), 2);

            if ($invoiceTotal > 0) {
                $income = collect([[
                    'account_number' => null,
                    'account_name' => 'QuickBooks Invoice Sales',
                    'amount' => $invoiceTotal,
                ]]);
                $totalIncome = $invoiceTotal;
            }

            if ($billTotal > 0) {
                $expenses = collect([[
                    'account_number' => null,
                    'account_name' => 'QuickBooks Vendor Expenses',
                    'amount' => $billTotal,
                ]]);
                $totalExpenses = $billTotal;
            }
        }

        $netIncome = $totalIncome - $totalExpenses;

        return response()->json([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'income' => $income,
            'total_income' => $totalIncome,
            'expenses' => $expenses,
            'total_expenses' => $totalExpenses,
            'net_income' => $netIncome,
            'branding' => Branding::get(),
        ]);
    }

    public function balanceSheet(Request $request)
    {
        $asOfDate = $request->get('as_of_date', now()->format('Y-m-d'));

        $ledgerTotalsAsOf = $this->buildLedgerTotals($asOfDate);

        $assets = ChartOfAccount::where('account_type', 'asset')
            ->get()
            ->map(function ($account) use ($ledgerTotalsAsOf, $asOfDate) {
                $amount = $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $asOfDate);

                if (abs($amount) < 0.01) {
                    return null;
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'amount' => $amount,
                ];
            })
            ->filter()
            ->values();

        $liabilities = ChartOfAccount::where('account_type', 'liability')
            ->get()
            ->map(function ($account) use ($ledgerTotalsAsOf, $asOfDate) {
                $amount = $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $asOfDate);

                if (abs($amount) < 0.01) {
                    return null;
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'amount' => $amount,
                ];
            })
            ->filter()
            ->values();

        $equity = ChartOfAccount::where('account_type', 'equity')
            ->get()
            ->map(function ($account) use ($ledgerTotalsAsOf, $asOfDate) {
                $amount = $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $asOfDate);

                if (abs($amount) < 0.01) {
                    return null;
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'amount' => $amount,
                ];
            })
            ->filter()
            ->values();

        $totalAssets = $assets->sum('amount');
        $totalLiabilities = $liabilities->sum('amount');
        $totalEquity = $equity->sum('amount');

        return response()->json([
            'as_of_date' => $asOfDate,
            'assets' => $assets,
            'total_assets' => $totalAssets,
            'liabilities' => $liabilities,
            'total_liabilities' => $totalLiabilities,
            'equity' => $equity,
            'total_equity' => $totalEquity,
            'liabilities_and_equity' => $totalLiabilities + $totalEquity,
            'branding' => Branding::get(),
        ]);
    }

    public function trialBalance(Request $request)
    {
        $asOfDate = $request->get('as_of_date', now()->format('Y-m-d'));

        $ledgerTotalsAsOf = $this->buildLedgerTotals($asOfDate);

        $accounts = ChartOfAccount::where('is_active', true)
            ->get()
            ->map(function ($account) use ($ledgerTotalsAsOf, $asOfDate) {
                $balance = $this->calculateAccountBalance($account, $ledgerTotalsAsOf, $asOfDate);

                if (abs($balance) < 0.01) {
                    return null;
                }

                $debitBalance = 0.0;
                $creditBalance = 0.0;

                $debitBased = in_array($account->account_type, ['asset', 'expense', 'cost_of_goods_sold', 'other_expense'], true);

                if ($debitBased) {
                    if ($balance >= 0) {
                        $debitBalance = $balance;
                    } else {
                        $creditBalance = abs($balance);
                    }
                } else {
                    if ($balance >= 0) {
                        $creditBalance = $balance;
                    } else {
                        $debitBalance = abs($balance);
                    }
                }

                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'account_type' => $account->account_type,
                    'debit' => $debitBalance,
                    'credit' => $creditBalance,
                ];
            })
            ->filter()
            ->values();

        $totalDebits = $accounts->sum('debit');
        $totalCredits = $accounts->sum('credit');

        return response()->json([
            'as_of_date' => $asOfDate,
            'accounts' => $accounts,
            'total_debits' => $totalDebits,
            'total_credits' => $totalCredits,
            'difference' => $totalDebits - $totalCredits,
            'branding' => Branding::get(),
        ]);
    }

    public function accountsReceivableAging(Request $request)
    {
        $asOfDate = $request->get('as_of_date', now()->format('Y-m-d'));

        $asOf = Carbon::parse($asOfDate);

        $invoices = Invoice::with('customer')
            ->whereIn('status', ['sent', 'partial', 'overdue'])
            ->where('balance', '>', 0)
            ->get()
            ->map(function ($invoice) use ($asOf) {
                $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date) : null;

                if (!$dueDate) {
                    $fallback = $invoice->issue_date ?: $invoice->created_at;
                    $dueDate = $fallback ? Carbon::parse($fallback) : clone $asOf;
                }

                $daysPastDue = $dueDate->diffInDays($asOf, false);
                $daysOverdue = $daysPastDue > 0 ? $daysPastDue : 0;
                
                $aging = 'current';
                if ($daysOverdue > 90) {
                    $aging = '90+';
                } elseif ($daysOverdue > 60) {
                    $aging = '61-90';
                } elseif ($daysOverdue > 30) {
                    $aging = '31-60';
                } elseif ($daysOverdue > 0) {
                    $aging = '1-30';
                }
                
                return [
                    'invoice_number' => $invoice->invoice_number,
                    'customer_name' => $invoice->customer->name ?? 'Unknown',
                    'invoice_date' => $invoice->issue_date,
                    'due_date' => $invoice->due_date,
                    'balance' => $invoice->balance,
                    'days_overdue' => $daysOverdue,
                    'aging_period' => $aging,
                ];
            });

        $summary = [
            'current' => $invoices->where('aging_period', 'current')->sum('balance'),
            '1-30' => $invoices->where('aging_period', '1-30')->sum('balance'),
            '31-60' => $invoices->where('aging_period', '31-60')->sum('balance'),
            '61-90' => $invoices->where('aging_period', '61-90')->sum('balance'),
            '90+' => $invoices->where('aging_period', '90+')->sum('balance'),
        ];

        return response()->json([
            'as_of_date' => $asOfDate,
            'invoices' => $invoices,
            'summary' => $summary,
            'total_receivable' => array_sum($summary),
            'branding' => Branding::get(),
        ]);
    }

    public function accountsPayableAging(Request $request)
    {
        $asOfDate = $request->get('as_of_date', now()->format('Y-m-d'));
        $asOf = Carbon::parse($asOfDate);

        $bills = Bill::with('vendor')
            ->whereIn('status', ['unpaid', 'partial', 'overdue'])
            ->where('balance', '>', 0)
            ->get()
            ->map(function ($bill) use ($asOf) {
                $dueDate = $bill->due_date ? Carbon::parse($bill->due_date) : null;

                if (!$dueDate) {
                    $fallback = $bill->bill_date ?: $bill->created_at;
                    $dueDate = $fallback ? Carbon::parse($fallback) : clone $asOf;
                }

                $daysPastDue = $dueDate->diffInDays($asOf, false);
                $daysOverdue = $daysPastDue > 0 ? $daysPastDue : 0;
                
                $aging = 'current';
                if ($daysOverdue > 90) {
                    $aging = '90+';
                } elseif ($daysOverdue > 60) {
                    $aging = '61-90';
                } elseif ($daysOverdue > 30) {
                    $aging = '31-60';
                } elseif ($daysOverdue > 0) {
                    $aging = '1-30';
                }
                
                return [
                    'bill_number' => $bill->bill_number,
                    'vendor_name' => $bill->vendor->vendor_name ?? 'Unknown',
                    'bill_date' => $bill->bill_date,
                    'due_date' => $bill->due_date,
                    'balance' => $bill->balance,
                    'days_overdue' => max(0, $daysOverdue),
                    'aging_period' => $aging,
                ];
            });

        $summary = [
            'current' => $bills->where('aging_period', 'current')->sum('balance'),
            '1-30' => $bills->where('aging_period', '1-30')->sum('balance'),
            '31-60' => $bills->where('aging_period', '31-60')->sum('balance'),
            '61-90' => $bills->where('aging_period', '61-90')->sum('balance'),
            '90+' => $bills->where('aging_period', '90+')->sum('balance'),
        ];

        return response()->json([
            'as_of_date' => $asOfDate,
            'bills' => $bills,
            'summary' => $summary,
            'total_payable' => array_sum($summary),
            'branding' => Branding::get(),
        ]);
    }

    public function taxSummary(Request $request)
    {
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        if (!$startDate) {
            $startDate = Carbon::now()->startOfYear()->format('Y-m-d');
        }

        if (!$endDate) {
            $endDate = Carbon::now()->format('Y-m-d');
        }

        $invoiceRange = Invoice::where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('issue_date', [$startDate, $endDate])
                      ->orWhere(function ($inner) use ($startDate, $endDate) {
                          $inner->whereNull('issue_date')
                                ->whereBetween('created_at', [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()]);
                      });
            })
            ->get();

        $billRange = Bill::whereBetween('bill_date', [$startDate, $endDate])->get();

        $salesTaxTotal = $invoiceRange->sum('tax_amount');
        $salesTaxCollected = $invoiceRange->whereIn('status', ['paid', 'partial'])->sum('tax_amount');
        $salesTaxPending = $invoiceRange->whereNotIn('status', ['paid', 'cancelled'])->sum('tax_amount');
        $taxableSales = $invoiceRange->sum('subtotal');
        $grossSales = $invoiceRange->sum('total');

        $purchaseTaxTotal = $billRange->sum('tax');
        $purchaseTaxPaid = $billRange->whereIn('status', ['paid', 'partial'])->sum('tax');
        $purchaseTaxOutstanding = $billRange->whereNotIn('status', ['paid'])->sum('tax');

        $salesTaxLiabilityAccount = ChartOfAccount::where('detail_type', 'sales_tax_payable')->sum('current_balance');

        $invoiceTaxBreakdown = $invoiceRange
            ->filter(fn ($invoice) => $invoice->tax_amount > 0)
            ->groupBy(function ($invoice) {
                if ($invoice->tax_name) {
                    return $invoice->tax_name;
                }

                if ($invoice->tax_rate) {
                    return number_format($invoice->tax_rate, 2) . '%';
                }

                return 'Unspecified';
            })
            ->map(function ($group, $key) {
                return [
                    'tax_name' => $key,
                    'invoice_count' => $group->count(),
                    'tax_amount' => $group->sum('tax_amount'),
                    'taxable_sales' => $group->sum('subtotal'),
                    'average_rate' => $group->avg('tax_rate'),
                ];
            })
            ->values();

        $billTaxBreakdown = $billRange
            ->filter(fn ($bill) => $bill->tax > 0)
            ->groupBy(function ($bill) {
                if ($bill->tax_name) {
                    return $bill->tax_name;
                }

                return 'Unspecified';
            })
            ->map(function ($group, $key) {
                return [
                    'tax_name' => $key,
                    'bill_count' => $group->count(),
                    'tax_amount' => $group->sum('tax'),
                    'taxable_purchases' => $group->sum('subtotal'),
                ];
            })
            ->values();

        $taxAccounts = ChartOfAccount::where(function ($query) {
                $query->where('detail_type', 'like', '%tax%')
                      ->orWhere('account_name', 'like', '%tax%');
            })
            ->get()
            ->map(function ($account) {
                return [
                    'account_number' => $account->account_number,
                    'account_name' => $account->account_name,
                    'account_type' => $account->account_type,
                    'detail_type' => $account->detail_type,
                    'opening_balance' => (float) $account->opening_balance,
                    'current_balance' => (float) $account->current_balance,
                ];
            })
            ->values();

        return response()->json([
            'start_date' => $startDate,
            'end_date' => $endDate,
            'sales_tax_total' => $salesTaxTotal,
            'sales_tax_collected' => $salesTaxCollected,
            'sales_tax_pending' => $salesTaxPending,
            'taxable_sales' => $taxableSales,
            'gross_sales' => $grossSales,
            'purchase_tax_total' => $purchaseTaxTotal,
            'purchase_tax_paid' => $purchaseTaxPaid,
            'purchase_tax_outstanding' => $purchaseTaxOutstanding,
            'net_tax_liability' => ($salesTaxCollected + $salesTaxPending) - $purchaseTaxPaid,
            'sales_tax_liability_account_balance' => $salesTaxLiabilityAccount,
            'invoice_count' => $invoiceRange->count(),
            'bill_count' => $billRange->count(),
            'invoice_tax_breakdown' => $invoiceTaxBreakdown,
            'bill_tax_breakdown' => $billTaxBreakdown,
            'tax_accounts' => $taxAccounts,
            'branding' => Branding::get(),
            'generated_at' => Carbon::now()->toDateTimeString(),
        ]);
    }

    protected function buildLedgerTotals(?string $endDate = null, ?string $startDate = null): array
    {
        $query = GeneralLedgerEntry::selectRaw('account_id, SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->whereNotNull('account_id');

        if ($startDate) {
            $query->whereDate('transaction_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('transaction_date', '<=', $endDate);
        }

        return $query
            ->groupBy('account_id')
            ->get()
            ->mapWithKeys(function ($row) {
                return [
                    (int) $row->account_id => [
                        'debit' => (float) ($row->total_debit ?? 0),
                        'credit' => (float) ($row->total_credit ?? 0),
                    ],
                ];
            })
            ->toArray();
    }

    protected function calculateAccountBalance(ChartOfAccount $account, array $ledgerTotals, ?string $asOfDate = null): float
    {
        $totals = $ledgerTotals[$account->id] ?? null;
        $debits = (float) ($totals['debit'] ?? 0);
        $credits = (float) ($totals['credit'] ?? 0);

        $balance = (float) $account->opening_balance;

        if (in_array($account->account_type, ['asset', 'expense', 'cost_of_goods_sold', 'other_expense'], true)) {
            $balance += $debits - $credits;
        } else {
            $balance += $credits - $debits;
        }

        if (abs($balance) < 0.01 && $account->current_balance !== null) {
            return (float) $account->current_balance;
        }

        return $balance;
    }

    protected function calculateAccountPeriodAmount(ChartOfAccount $account, array $ledgerTotals): float
    {
        $totals = $ledgerTotals[$account->id] ?? ['debit' => 0, 'credit' => 0];
        $debits = (float) ($totals['debit'] ?? 0);
        $credits = (float) ($totals['credit'] ?? 0);

        if (in_array($account->account_type, ['revenue', 'other_income', 'liability', 'equity'], true)) {
            return $credits - $debits;
        }

        return $debits - $credits;
    }
}

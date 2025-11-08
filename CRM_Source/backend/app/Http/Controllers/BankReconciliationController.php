<?php

namespace App\Http\Controllers;

use App\Models\BankAccount;
use App\Models\BankTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BankReconciliationController extends Controller
{
    public function getReconciliationData(Request $request, $bankAccountId)
    {
        $validator = Validator::make($request->all(), [
            'statement_date' => ['required', 'date'],
            'statement_balance' => ['required', 'numeric'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bankAccount = BankAccount::findOrFail($bankAccountId);

        // Get unreconciled transactions up to statement date
        $unreconciledTransactions = BankTransaction::where('bank_account_id', $bankAccountId)
            ->where('is_reconciled', false)
            ->where('transaction_date', '<=', $request->statement_date)
            ->orderBy('transaction_date')
            ->get();

        // Calculate cleared balance (what should match statement)
        $clearedBalance = $bankAccount->opening_balance;
        
        $reconciledTransactions = BankTransaction::where('bank_account_id', $bankAccountId)
            ->where('is_reconciled', true)
            ->orderBy('transaction_date')
            ->get();

        foreach ($reconciledTransactions as $trans) {
            $clearedBalance += $trans->credit - $trans->debit;
        }

        // Calculate difference
        $difference = $request->statement_balance - $clearedBalance;

        return response()->json([
            'bank_account' => $bankAccount,
            'unreconciled_transactions' => $unreconciledTransactions,
            'reconciled_count' => $reconciledTransactions->count(),
            'cleared_balance' => $clearedBalance,
            'statement_balance' => $request->statement_balance,
            'difference' => $difference,
            'statement_date' => $request->statement_date,
        ]);
    }

    public function finishReconciliation(Request $request, $bankAccountId)
    {
        $validator = Validator::make($request->all(), [
            'statement_date' => ['required', 'date'],
            'statement_balance' => ['required', 'numeric'],
            'cleared_transaction_ids' => ['required', 'array'],
            'cleared_transaction_ids.*' => ['exists:bank_transactions,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bankAccount = BankAccount::findOrFail($bankAccountId);

        // Mark cleared transactions as reconciled
        BankTransaction::whereIn('id', $request->cleared_transaction_ids)
            ->update([
                'is_reconciled' => true,
                'reconciled_date' => $request->statement_date,
            ]);

        return response()->json([
            'message' => 'Reconciliation completed successfully',
            'reconciled_count' => count($request->cleared_transaction_ids),
        ]);
    }
}

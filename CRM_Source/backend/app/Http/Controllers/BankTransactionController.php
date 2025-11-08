<?php

namespace App\Http\Controllers;

use App\Models\BankTransaction;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BankTransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = BankTransaction::with(['bankAccount', 'account', 'creator']);

        if ($request->has('bank_account_id')) {
            $query->where('bank_account_id', $request->bank_account_id);
        }

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_reconciled')) {
            $query->where('is_reconciled', $request->is_reconciled == 'true');
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('payee', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('check_number', 'like', "%{$search}%")
                  ->orWhere('reference', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $transactions = $query->orderBy('transaction_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json($transactions);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bank_account_id' => ['required', 'exists:bank_accounts,id'],
            'transaction_date' => ['required', 'date'],
            'type' => ['required', 'in:deposit,withdrawal,check,transfer,fee,interest,other'],
            'debit' => ['nullable', 'numeric', 'min:0'],
            'credit' => ['nullable', 'numeric', 'min:0'],
            'payee' => ['nullable', 'string', 'max:255'],
            'check_number' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:chart_of_accounts,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Ensure either debit or credit is provided, but not both
        if (($request->debit > 0 && $request->credit > 0) || ($request->debit == 0 && $request->credit == 0)) {
            return response()->json([
                'message' => 'Transaction must have either a debit or credit amount, but not both'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $bankAccount = BankAccount::findOrFail($request->bank_account_id);

            $debit = $request->debit ?? 0;
            $credit = $request->credit ?? 0;
            $newBalance = $bankAccount->current_balance + $credit - $debit;

            $transactionData = $request->all();
            $transactionData['debit'] = $debit;
            $transactionData['credit'] = $credit;
            $transactionData['balance'] = $newBalance;
            $transactionData['created_by'] = $request->user()->id;

            $transaction = BankTransaction::create($transactionData);

            $bankAccount->current_balance = $newBalance;
            $bankAccount->save();

            DB::commit();
            return response()->json([
                'message' => 'Transaction recorded successfully',
                'transaction' => $transaction->load(['bankAccount', 'account'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $transaction = BankTransaction::with(['bankAccount', 'account', 'creator'])->findOrFail($id);
        return response()->json($transaction);
    }

    public function update(Request $request, $id)
    {
        $transaction = BankTransaction::findOrFail($id);

        if ($transaction->is_reconciled) {
            return response()->json([
                'message' => 'Cannot edit a reconciled transaction'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'transaction_date' => ['required', 'date'],
            'type' => ['required', 'in:deposit,withdrawal,check,transfer,fee,interest,other'],
            'debit' => ['nullable', 'numeric', 'min:0'],
            'credit' => ['nullable', 'numeric', 'min:0'],
            'payee' => ['nullable', 'string', 'max:255'],
            'check_number' => ['nullable', 'string', 'max:50'],
            'account_id' => ['nullable', 'exists:chart_of_accounts,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (($request->debit > 0 && $request->credit > 0) || ($request->debit == 0 && $request->credit == 0)) {
            return response()->json([
                'message' => 'Transaction must have either a debit or credit amount, but not both'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $bankAccount = $transaction->bankAccount;

            // Reverse old transaction effect
            $bankAccount->current_balance -= $transaction->credit;
            $bankAccount->current_balance += $transaction->debit;

            // Apply new transaction
            $debit = $request->debit ?? 0;
            $credit = $request->credit ?? 0;
            $newBalance = $bankAccount->current_balance + $credit - $debit;

            $transaction->update([
                'transaction_date' => $request->transaction_date,
                'type' => $request->type,
                'check_number' => $request->check_number,
                'payee' => $request->payee,
                'description' => $request->description,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $newBalance,
                'account_id' => $request->account_id,
                'reference' => $request->reference,
                'memo' => $request->memo,
            ]);

            $bankAccount->current_balance = $newBalance;
            $bankAccount->save();

            DB::commit();
            return response()->json([
                'message' => 'Transaction updated successfully',
                'transaction' => $transaction->load(['bankAccount', 'account'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $transaction = BankTransaction::findOrFail($id);

        if ($transaction->is_reconciled) {
            return response()->json([
                'message' => 'Cannot delete a reconciled transaction'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $bankAccount = $transaction->bankAccount;

            // Reverse transaction effect
            $bankAccount->current_balance -= $transaction->credit;
            $bankAccount->current_balance += $transaction->debit;
            $bankAccount->save();

            $transaction->delete();

            DB::commit();
            return response()->json(['message' => 'Transaction deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete transaction', 'error' => $e->getMessage()], 500);
        }
    }

    public function reconcile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'transaction_ids' => ['required', 'array', 'min:1'],
            'transaction_ids.*' => ['exists:bank_transactions,id'],
            'reconciled_date' => ['required', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            BankTransaction::whereIn('id', $request->transaction_ids)->update([
                'is_reconciled' => true,
                'reconciled_date' => $request->reconciled_date,
            ]);

            DB::commit();
            return response()->json(['message' => 'Transactions reconciled successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to reconcile transactions', 'error' => $e->getMessage()], 500);
        }
    }

    public function unreconcile(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'transaction_ids' => ['required', 'array', 'min:1'],
            'transaction_ids.*' => ['exists:bank_transactions,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            BankTransaction::whereIn('id', $request->transaction_ids)->update([
                'is_reconciled' => false,
                'reconciled_date' => null,
            ]);

            DB::commit();
            return response()->json(['message' => 'Transactions unreconciled successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to unreconcile transactions', 'error' => $e->getMessage()], 500);
        }
    }
}

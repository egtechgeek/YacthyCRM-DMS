<?php

namespace App\Http\Controllers;

use App\Models\BillPayment;
use App\Models\Bill;
use App\Models\BankAccount;
use App\Models\BankTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BillPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = BillPayment::with(['bill.vendor', 'bankAccount', 'creator']);

        if ($request->has('bill_id')) {
            $query->where('bill_id', $request->bill_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('payment_date', [$request->start_date, $request->end_date]);
        }

        $perPage = $request->get('per_page', 15);
        $payments = $query->orderBy('payment_date', 'desc')->paginate($perPage);

        return response()->json($payments);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bill_id' => ['required', 'exists:bills,id'],
            'bank_account_id' => ['nullable', 'exists:bank_accounts,id'],
            'payment_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:check,cash,credit_card,debit_card,bank_transfer,other'],
            'check_number' => ['nullable', 'string', 'max:50'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bill = Bill::findOrFail($request->bill_id);

        if ($request->amount > $bill->balance) {
            return response()->json([
                'message' => 'Payment amount cannot exceed bill balance',
                'balance' => $bill->balance
            ], 422);
        }

        DB::beginTransaction();
        try {
            $paymentData = $request->all();
            $paymentData['created_by'] = $request->user()->id;

            $payment = BillPayment::create($paymentData);

            // Create bank transaction if bank account specified
            if ($request->bank_account_id) {
                $bankAccount = BankAccount::find($request->bank_account_id);
                
                BankTransaction::create([
                    'bank_account_id' => $request->bank_account_id,
                    'transaction_date' => $request->payment_date,
                    'type' => $request->payment_method === 'check' ? 'check' : 'withdrawal',
                    'check_number' => $request->check_number,
                    'payee' => $bill->vendor->vendor_name,
                    'description' => "Payment for Bill #{$bill->bill_number}",
                    'debit' => $request->amount,
                    'credit' => 0,
                    'balance' => $bankAccount->current_balance - $request->amount,
                    'reference' => "Bill Payment #{$payment->id}",
                    'created_by' => $request->user()->id,
                ]);

                $bankAccount->current_balance -= $request->amount;
                $bankAccount->save();
            }

            $bill->updateStatus();

            DB::commit();
            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment->load(['bill.vendor', 'bankAccount'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to record payment', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $payment = BillPayment::with(['bill.vendor', 'bankAccount', 'creator'])->findOrFail($id);
        return response()->json($payment);
    }

    public function destroy($id)
    {
        $payment = BillPayment::findOrFail($id);
        $bill = $payment->bill;

        DB::beginTransaction();
        try {
            // If payment was from a bank account, reverse the transaction
            if ($payment->bank_account_id) {
                $bankAccount = BankAccount::find($payment->bank_account_id);
                $bankAccount->current_balance += $payment->amount;
                $bankAccount->save();

                // Mark associated bank transaction as reversed
                BankTransaction::where('reference', "Bill Payment #{$payment->id}")->delete();
            }

            $payment->delete();
            $bill->updateStatus();

            DB::commit();
            return response()->json(['message' => 'Payment deleted successfully']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to delete payment', 'error' => $e->getMessage()], 500);
        }
    }
}

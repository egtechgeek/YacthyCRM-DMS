<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\BankAccount;
use Illuminate\Support\Facades\Validator;

class BankAccountController extends Controller
{
    /**
     * Get all bank accounts
     */
    public function index(Request $request)
    {
        $query = BankAccount::with('chartAccount');

        if ($request->has('active')) {
            $query->where('is_active', $request->active);
        }

        $accounts = $query->orderBy('account_name')->get();

        return response()->json($accounts, 200);
    }

    /**
     * Store a new bank account
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'account_name' => ['required', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'routing_number' => ['nullable', 'string', 'max:255'],
            'chart_account_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'opening_balance' => ['nullable', 'numeric'],
            'opening_balance_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bankAccount = BankAccount::create([
            ...$request->all(),
            'current_balance' => $request->opening_balance ?? 0,
        ]);

        return response()->json($bankAccount->load('chartAccount'), 201);
    }

    /**
     * Get a specific bank account
     */
    public function show($id)
    {
        $account = BankAccount::with('chartAccount')->findOrFail($id);

        return response()->json($account, 200);
    }

    /**
     * Update a bank account
     */
    public function update(Request $request, $id)
    {
        $account = BankAccount::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'account_name' => ['sometimes', 'string', 'max:255'],
            'account_number' => ['nullable', 'string', 'max:255'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'routing_number' => ['nullable', 'string', 'max:255'],
            'chart_account_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'is_active' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $account->update($request->all());

        return response()->json($account->load('chartAccount'), 200);
    }

    /**
     * Delete a bank account
     */
    public function destroy($id)
    {
        $account = BankAccount::findOrFail($id);
        $account->delete();

        return response()->json(['message' => 'Bank account deleted successfully'], 200);
    }
}

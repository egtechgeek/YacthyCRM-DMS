<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ChartOfAccountsController extends Controller
{
    /**
     * Get all accounts (hierarchical)
     */
    public function index(Request $request)
    {
        $query = ChartOfAccount::with(['parent', 'subAccounts']);

        // Filter by type
        if ($request->has('type')) {
            $query->where('account_type', $request->type);
        }

        // Filter by active status
        if ($request->has('active')) {
            $query->where('is_active', $request->active);
        }

        // Get accounts ordered by account number
        $accounts = $query->orderBy('account_number')->paginate($request->get('per_page', 50));

        // Build hierarchical structure from all accounts for tree view
        $allAccounts = ChartOfAccount::orderBy('account_number')->get();
        $tree = $this->buildAccountTree($allAccounts);

        return response()->json([
            'data' => $accounts->items(),
            'current_page' => $accounts->currentPage(),
            'last_page' => $accounts->lastPage(),
            'per_page' => $accounts->perPage(),
            'total' => $accounts->total(),
            'accounts' => $accounts->items(), // For backwards compatibility
            'tree' => $tree,
        ], 200);
    }

    /**
     * Store a new account
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'account_number' => ['required', 'string', 'max:10', 'unique:chart_of_accounts,account_number'],
            'account_name' => ['required', 'string', 'max:255'],
            'account_type' => ['required', 'in:asset,liability,equity,revenue,expense,other_income,other_expense,cost_of_goods_sold'],
            'detail_type' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'description' => ['nullable', 'string'],
            'opening_balance' => ['nullable', 'numeric'],
            'opening_balance_date' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $account = ChartOfAccount::create([
            ...$request->all(),
            'is_sub_account' => $request->parent_id ? true : false,
        ]);

        return response()->json($account->load('parent'), 201);
    }

    /**
     * Get a specific account
     */
    public function show($id)
    {
        $account = ChartOfAccount::with(['parent', 'subAccounts', 'journalEntryLines.journalEntry'])
            ->findOrFail($id);

        // Calculate current balance
        $account->current_balance = $account->calculateBalance();
        $account->save();

        return response()->json($account, 200);
    }

    /**
     * Update an account
     */
    public function update(Request $request, $id)
    {
        $account = ChartOfAccount::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'account_number' => ['sometimes', 'string', 'max:10', 'unique:chart_of_accounts,account_number,' . $id],
            'account_name' => ['sometimes', 'string', 'max:255'],
            'account_type' => ['sometimes', 'in:asset,liability,equity,revenue,expense,other_income,other_expense,cost_of_goods_sold'],
            'detail_type' => ['nullable', 'string'],
            'parent_id' => ['nullable', 'exists:chart_of_accounts,id'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('parent_id')) {
            $account->is_sub_account = $request->parent_id ? true : false;
        }

        $account->update($request->all());

        return response()->json($account->load('parent'), 200);
    }

    /**
     * Delete an account
     */
    public function destroy($id)
    {
        $account = ChartOfAccount::findOrFail($id);

        // Check if account has transactions
        if ($account->journalEntryLines()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete account with existing transactions'
            ], 400);
        }

        // Check if account has sub-accounts
        if ($account->subAccounts()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete account with sub-accounts'
            ], 400);
        }

        $account->delete();

        return response()->json(['message' => 'Account deleted successfully'], 200);
    }

    /**
     * Build hierarchical account tree
     */
    private function buildAccountTree($accounts)
    {
        $tree = [];
        
        // Group by account type
        $groupedAccounts = $accounts->groupBy('account_type');

        foreach ($groupedAccounts as $type => $typeAccounts) {
            $tree[$type] = [
                'name' => ucwords(str_replace('_', ' ', $type)),
                'accounts' => $typeAccounts->where('parent_id', null)->values()->map(function($account) use ($typeAccounts) {
                    return [
                        'account' => $account,
                        'sub_accounts' => $typeAccounts->where('parent_id', $account->id)->values(),
                    ];
                }),
            ];
        }

        return $tree;
    }

    /**
     * Recalculate all account balances
     */
    public function recalculateBalances(Request $request)
    {
        $accounts = ChartOfAccount::all();
        
        foreach ($accounts as $account) {
            $account->current_balance = $account->calculateBalance();
            $account->save();
        }

        return response()->json([
            'message' => 'All account balances recalculated',
            'count' => $accounts->count()
        ], 200);
    }
}

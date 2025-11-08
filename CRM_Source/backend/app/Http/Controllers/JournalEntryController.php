<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    /**
     * Get all journal entries
     */
    public function index(Request $request)
    {
        $query = JournalEntry::with(['lines.account', 'creator', 'approver']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('entry_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('entry_date', '<=', $request->end_date);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'entry_date');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $entries = $query->paginate($request->get('per_page', 15));

        return response()->json($entries, 200);
    }

    /**
     * Store a new journal entry
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'entry_date' => ['required', 'date'],
            'description' => ['nullable', 'string'],
            'memo' => ['nullable', 'string'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'exists:chart_of_accounts,id'],
            'lines.*.debit' => ['required', 'numeric', 'min:0'],
            'lines.*.credit' => ['required', 'numeric', 'min:0'],
            'lines.*.description' => ['nullable', 'string'],
            'lines.*.reference' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Validate that debits equal credits
        $totalDebits = collect($request->lines)->sum('debit');
        $totalCredits = collect($request->lines)->sum('credit');

        if (abs($totalDebits - $totalCredits) > 0.01) {
            return response()->json([
                'message' => 'Entry is not balanced. Total debits must equal total credits.',
                'total_debits' => $totalDebits,
                'total_credits' => $totalCredits,
                'difference' => $totalDebits - $totalCredits,
            ], 422);
        }

        // Validate that each line has either debit OR credit, not both
        foreach ($request->lines as $line) {
            if ($line['debit'] > 0 && $line['credit'] > 0) {
                return response()->json([
                    'message' => 'Each line must have either a debit or credit, not both'
                ], 422);
            }
            if ($line['debit'] == 0 && $line['credit'] == 0) {
                return response()->json([
                    'message' => 'Each line must have a debit or credit amount'
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            // Create journal entry
            $entry = JournalEntry::create([
                'entry_number' => JournalEntry::generateEntryNumber(),
                'entry_date' => $request->entry_date,
                'description' => $request->description,
                'memo' => $request->memo,
                'created_by' => $user->id,
                'status' => 'draft',
            ]);

            // Create lines
            foreach ($request->lines as $lineData) {
                JournalEntryLine::create([
                    'journal_entry_id' => $entry->id,
                    'account_id' => $lineData['account_id'],
                    'debit' => $lineData['debit'],
                    'credit' => $lineData['credit'],
                    'description' => $lineData['description'] ?? null,
                    'reference' => $lineData['reference'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json($entry->load(['lines.account', 'creator']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create journal entry: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific journal entry
     */
    public function show($id)
    {
        $entry = JournalEntry::with(['lines.account', 'creator', 'approver'])->findOrFail($id);

        return response()->json($entry, 200);
    }

    /**
     * Update a journal entry (only if draft)
     */
    public function update(Request $request, $id)
    {
        $entry = JournalEntry::findOrFail($id);

        if ($entry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries can be edited'], 400);
        }

        $validator = Validator::make($request->all(), [
            'entry_date' => ['sometimes', 'date'],
            'description' => ['nullable', 'string'],
            'memo' => ['nullable', 'string'],
            'lines' => ['sometimes', 'array', 'min:2'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // Update entry details
            $entry->update($request->only(['entry_date', 'description', 'memo']));

            // Update lines if provided
            if ($request->has('lines')) {
                // Validate balance
                $totalDebits = collect($request->lines)->sum('debit');
                $totalCredits = collect($request->lines)->sum('credit');

                if (abs($totalDebits - $totalCredits) > 0.01) {
                    return response()->json([
                        'message' => 'Entry is not balanced',
                    ], 422);
                }

                // Delete old lines and create new ones
                $entry->lines()->delete();

                foreach ($request->lines as $lineData) {
                    JournalEntryLine::create([
                        'journal_entry_id' => $entry->id,
                        'account_id' => $lineData['account_id'],
                        'debit' => $lineData['debit'],
                        'credit' => $lineData['credit'],
                        'description' => $lineData['description'] ?? null,
                        'reference' => $lineData['reference'] ?? null,
                    ]);
                }
            }

            DB::commit();

            return response()->json($entry->load(['lines.account', 'creator']), 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update journal entry'], 500);
        }
    }

    /**
     * Post a journal entry (make it permanent)
     */
    public function post(Request $request, $id)
    {
        $user = $request->user();
        $entry = JournalEntry::with('lines')->findOrFail($id);

        if ($entry->status !== 'draft') {
            return response()->json(['message' => 'Entry is already posted'], 400);
        }

        if (!$entry->isBalanced()) {
            return response()->json(['message' => 'Entry is not balanced'], 400);
        }

        DB::beginTransaction();
        try {
            $entry->status = 'posted';
            $entry->approved_by = $user->id;
            $entry->approved_at = now();
            $entry->save();

            // Update account balances
            foreach ($entry->lines as $line) {
                $account = $line->account;
                $account->current_balance = $account->calculateBalance();
                $account->save();
            }

            DB::commit();

            return response()->json([
                'message' => 'Journal entry posted successfully',
                'entry' => $entry->load(['lines.account', 'approver'])
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to post journal entry'], 500);
        }
    }

    /**
     * Void a journal entry
     */
    public function void(Request $request, $id)
    {
        $entry = JournalEntry::with('lines')->findOrFail($id);

        if ($entry->status === 'void') {
            return response()->json(['message' => 'Entry is already void'], 400);
        }

        DB::beginTransaction();
        try {
            $entry->status = 'void';
            $entry->save();

            // Update account balances
            foreach ($entry->lines as $line) {
                $account = $line->account;
                $account->current_balance = $account->calculateBalance();
                $account->save();
            }

            DB::commit();

            return response()->json(['message' => 'Journal entry voided'], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to void entry'], 500);
        }
    }

    /**
     * Delete a journal entry (only if draft)
     */
    public function destroy($id)
    {
        $entry = JournalEntry::findOrFail($id);

        if ($entry->status !== 'draft') {
            return response()->json(['message' => 'Only draft entries can be deleted'], 400);
        }

        $entry->delete();

        return response()->json(['message' => 'Journal entry deleted'], 200);
    }

    /**
     * Build hierarchical account tree for QuickBooks-style display
     */
    private function buildAccountTree($accounts)
    {
        $tree = [];
        
        $accountTypes = [
            'asset' => 'Assets',
            'liability' => 'Liabilities',
            'equity' => 'Equity',
            'revenue' => 'Income',
            'expense' => 'Expenses',
            'other_income' => 'Other Income',
            'other_expense' => 'Other Expenses',
            'cost_of_goods_sold' => 'Cost of Goods Sold',
        ];

        foreach ($accountTypes as $type => $label) {
            $typeAccounts = $accounts->where('account_type', $type)->where('parent_id', null);
            
            if ($typeAccounts->count() > 0) {
                $tree[$type] = [
                    'label' => $label,
                    'accounts' => $typeAccounts->map(function($account) use ($accounts) {
                        return [
                            'id' => $account->id,
                            'number' => $account->account_number,
                            'name' => $account->account_name,
                            'balance' => $account->current_balance,
                            'sub_accounts' => $accounts->where('parent_id', $account->id)->values(),
                        ];
                    })->values(),
                ];
            }
        }

        return $tree;
    }
}

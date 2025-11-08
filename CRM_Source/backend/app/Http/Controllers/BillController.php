<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\BillItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BillController extends Controller
{
    public function index(Request $request)
    {
        $query = Bill::with(['vendor', 'items']);

        if ($request->has('vendor_id')) {
            $query->where('vendor_id', $request->vendor_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('bill_number', 'like', "%{$search}%")
                  ->orWhere('ref_number', 'like', "%{$search}%")
                  ->orWhereHas('vendor', function ($vq) use ($search) {
                      $vq->where('vendor_name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('bill_date', [$request->start_date, $request->end_date]);
        }

        $perPage = $request->get('per_page', 15);
        $bills = $query->orderBy('bill_date', 'desc')->paginate($perPage);

        return response()->json($bills);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vendor_id' => ['required', 'exists:vendors,id'],
            'bill_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:bill_date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.rate' => ['required', 'numeric', 'min:0'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.account_id' => ['nullable', 'exists:chart_of_accounts,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $billData = $request->except('items');
            $billData['subtotal'] = collect($request->items)->sum('amount');
            $billData['tax'] = $request->tax ?? 0;
            $billData['total'] = $billData['subtotal'] + $billData['tax'];
            $billData['balance'] = $billData['total'];

            $bill = Bill::create($billData);

            foreach ($request->items as $item) {
                BillItem::create([
                    'bill_id' => $bill->id,
                    'account_id' => $item['account_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'rate' => $item['rate'],
                    'amount' => $item['amount'],
                ]);
            }

            DB::commit();
            return response()->json([
                'message' => 'Bill created successfully',
                'bill' => $bill->load(['vendor', 'items'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create bill', 'error' => $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $bill = Bill::with(['vendor', 'items.account', 'payments.bankAccount'])->findOrFail($id);
        return response()->json($bill);
    }

    public function update(Request $request, $id)
    {
        $bill = Bill::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'vendor_id' => ['required', 'exists:vendors,id'],
            'bill_date' => ['required', 'date'],
            'due_date' => ['required', 'date', 'after_or_equal:bill_date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string'],
            'items.*.quantity' => ['required', 'numeric', 'min:0'],
            'items.*.rate' => ['required', 'numeric', 'min:0'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
            'items.*.account_id' => ['nullable', 'exists:chart_of_accounts,id'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            $billData = $request->except('items');
            $billData['subtotal'] = collect($request->items)->sum('amount');
            $billData['tax'] = $request->tax ?? 0;
            $billData['total'] = $billData['subtotal'] + $billData['tax'];

            $bill->update($billData);

            // Delete old items and create new ones
            $bill->items()->delete();
            foreach ($request->items as $item) {
                BillItem::create([
                    'bill_id' => $bill->id,
                    'account_id' => $item['account_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'rate' => $item['rate'],
                    'amount' => $item['amount'],
                ]);
            }

            $bill->updateStatus();

            DB::commit();
            return response()->json([
                'message' => 'Bill updated successfully',
                'bill' => $bill->load(['vendor', 'items'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update bill', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $bill = Bill::findOrFail($id);
        
        if ($bill->amount_paid > 0) {
            return response()->json([
                'message' => 'Cannot delete a bill that has payments. Please delete payments first.'
            ], 422);
        }

        $bill->delete();

        return response()->json(['message' => 'Bill deleted successfully']);
    }
}

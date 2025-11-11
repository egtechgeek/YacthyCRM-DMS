<?php

namespace App\Http\Controllers;

use App\Models\Part;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PartController extends Controller
{
    /**
     * Get all parts
     */
    public function index(Request $request)
    {
        $query = Part::with(['vendorMappings.vendor']);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Filter low stock
        if ($request->has('low_stock') && $request->low_stock) {
            $query->whereRaw('stock_quantity <= min_stock_level');
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['sku', 'name', 'price', 'stock_quantity'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        } else {
            $query->orderBy('name', 'asc');
        }

        $parts = $query->paginate(20);

        return response()->json($parts, 200);
    }

    /**
     * Get single part
     */
    public function show($id)
    {
        $part = Part::with(['vendorMappings.vendor'])->findOrFail($id);
        return response()->json(['part' => $part], 200);
    }

    /**
     * Create new part
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'sku' => ['required', 'string', 'max:255', 'unique:parts'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'min_stock_level' => ['nullable', 'integer', 'min:0'],
            'location' => ['nullable', 'string', 'max:255'],
            'vendor_part_numbers' => ['nullable', 'string'],
            'vendor_part_number' => ['nullable', 'string', 'max:255'],
            'manufacturer_part_number' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();

        if (array_key_exists('unit_price', $data)) {
            $data['price'] = $data['unit_price'];
            unset($data['unit_price']);
        }

        $part = Part::create($data);

        return response()->json([
            'message' => 'Part created successfully',
            'part' => $part
        ], 201);
    }

    /**
     * Update part
     */
    public function update($id, Request $request)
    {
        $part = Part::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'sku' => ['sometimes', 'string', 'max:255', 'unique:parts,sku,' . $id],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'category' => ['nullable', 'string', 'max:255'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'stock_quantity' => ['nullable', 'integer', 'min:0'],
            'min_stock_level' => ['nullable', 'integer', 'min:0'],
            'location' => ['nullable', 'string', 'max:255'],
            'vendor_part_numbers' => ['nullable', 'string'],
            'vendor_part_number' => ['nullable', 'string', 'max:255'],
            'manufacturer_part_number' => ['nullable', 'string', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();

        if (array_key_exists('unit_price', $data)) {
            $data['price'] = $data['unit_price'];
            unset($data['unit_price']);
        }

        $part->update($data);

        return response()->json([
            'message' => 'Part updated successfully',
            'part' => $part->fresh()->load('vendorMappings.vendor')
        ], 200);
    }

    /**
     * Delete part
     */
    public function destroy($id)
    {
        $part = Part::findOrFail($id);
        $part->delete();

        return response()->json(['message' => 'Part deleted successfully'], 200);
    }
}


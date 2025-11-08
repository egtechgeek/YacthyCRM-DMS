<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\PartCategory;
use Illuminate\Support\Facades\Validator;

class PartCategoryController extends Controller
{
    /**
     * Get all part categories
     */
    public function index(Request $request)
    {
        $query = PartCategory::query();

        // Only active categories by default, unless requesting all
        if ($request->input('show_all') !== 'true') {
            $query->where('active', true);
        }

        $categories = $query->orderBy('sort_order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json(['data' => $categories], 200);
    }

    /**
     * Create a new category
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:255', 'unique:part_categories,name'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category = PartCategory::create($request->all());

        return response()->json($category, 201);
    }

    /**
     * Update category
     */
    public function update($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $category = PartCategory::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => ['sometimes', 'string', 'max:255', 'unique:part_categories,name,' . $id],
            'description' => ['nullable', 'string'],
            'active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $category->update($request->all());

        return response()->json($category, 200);
    }

    /**
     * Delete category
     */
    public function destroy($id, Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $category = PartCategory::findOrFail($id);

        // Check if any parts use this category
        $partsCount = \App\Models\Part::where('category', $category->name)->count();
        
        if ($partsCount > 0) {
            return response()->json([
                'message' => "Cannot delete category. {$partsCount} part(s) are using this category."
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully'], 200);
    }
}

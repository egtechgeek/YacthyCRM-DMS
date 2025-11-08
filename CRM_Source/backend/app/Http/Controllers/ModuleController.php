<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Module;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;

class ModuleController extends Controller
{
    /**
     * Get all modules (public - for navigation)
     */
    public function index()
    {
        $modules = Cache::remember('enabled_modules', 3600, function () {
            return Module::orderBy('display_order')->get();
        });

        return response()->json($modules, 200);
    }

    /**
     * Update modules (Admin only)
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user || $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'modules' => ['required', 'array'],
            'modules.*.key' => ['required', 'string'],
            'modules.*.enabled' => ['required', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->modules as $moduleData) {
            $module = Module::where('key', $moduleData['key'])->first();
            if ($module) {
                $module->enabled = $moduleData['enabled'];
                $module->save();
            }
        }

        // Clear the cache
        Cache::forget('enabled_modules');

        return response()->json([
            'message' => 'Modules updated successfully',
            'modules' => Module::orderBy('display_order')->get()
        ], 200);
    }
}

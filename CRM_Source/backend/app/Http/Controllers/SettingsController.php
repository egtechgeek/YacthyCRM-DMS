<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use App\Support\Branding;

class SettingsController extends Controller
{
    /**
     * Get all settings
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $settings = Setting::all();

        // Transform to key-value object for easier frontend use
        $settingsObject = [];
        foreach ($settings as $setting) {
            $settingsObject[$setting->key] = [
                'value' => $setting->value,
                'type' => $setting->type,
                'description' => $setting->description,
            ];
        }

        return response()->json(['data' => $settingsObject], 200);
    }

    /**
     * Update settings
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'settings' => ['required', 'array'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->settings as $key => $value) {
            $setting = Setting::where('key', $key)->first();
            if ($setting) {
                $setting->value = $value;
                $setting->save();
            }
        }

        return response()->json(['message' => 'Settings updated successfully'], 200);
    }

    /**
     * Get branding settings (public - no auth required)
     */
    public function getBranding()
    {
        return response()->json(Branding::get(), 200);
    }

    /**
     * Update branding settings
     */
    public function updateBranding(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'crm_name' => ['nullable', 'string', 'max:255'],
            'logo_login' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'logo_header' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'logo_invoice' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,svg', 'max:2048'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'business_legal_name' => ['nullable', 'string', 'max:255'],
            'business_phone' => ['nullable', 'string', 'max:50'],
            'business_email' => ['nullable', 'email', 'max:255'],
            'business_website' => ['nullable', 'string', 'max:255'],
            'business_tax_id' => ['nullable', 'string', 'max:100'],
            'business_address_line1' => ['nullable', 'string', 'max:255'],
            'business_address_line2' => ['nullable', 'string', 'max:255'],
            'business_city' => ['nullable', 'string', 'max:120'],
            'business_state' => ['nullable', 'string', 'max:120'],
            'business_postal_code' => ['nullable', 'string', 'max:30'],
            'business_country' => ['nullable', 'string', 'max:120'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Update or create the main branding record
        $setting = Setting::firstOrCreate(
            ['key' => 'crm_name'],
            ['value' => 'enabled', 'type' => 'branding', 'description' => 'CRM Branding Settings']
        );

        // Update CRM name if provided
        if ($request->has('crm_name')) {
            $crmName = $request->input('crm_name');
            $setting->crm_name = $crmName !== null && trim($crmName) !== '' ? $crmName : null;
        }

        $businessFields = [
            'business_name',
            'business_legal_name',
            'business_phone',
            'business_email',
            'business_website',
            'business_tax_id',
            'business_address_line1',
            'business_address_line2',
            'business_city',
            'business_state',
            'business_postal_code',
            'business_country',
        ];

        foreach ($businessFields as $field) {
            if ($request->has($field)) {
                $value = $request->input($field);
                $setting->$field = $value !== null && trim($value) !== '' ? $value : null;
            }
        }

        // Handle logo uploads
        $logoFields = ['logo_login', 'logo_header', 'logo_invoice'];
        foreach ($logoFields as $field) {
            if ($request->hasFile($field)) {
                // Delete old logo if exists
                if ($setting->$field && Storage::disk('public')->exists($setting->$field)) {
                    Storage::disk('public')->delete($setting->$field);
                }

                // Store new logo
                $file = $request->file($field);
                $filename = $field . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('logos', $filename, 'public');
                $setting->$field = $path;
            }
        }

        $setting->save();

        return response()->json([
            'message' => 'Branding updated successfully',
            'branding' => Branding::get()
        ], 200);
    }

    /**
     * Delete a specific logo
     */
    public function deleteLogo(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'logo_type' => ['required', 'string', 'in:logo_login,logo_header,logo_invoice'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $setting = Setting::where('key', 'crm_name')->first();
        if ($setting) {
            $logoField = $request->logo_type;
            if ($setting->$logoField && Storage::disk('public')->exists($setting->$logoField)) {
                Storage::disk('public')->delete($setting->$logoField);
            }
            $setting->$logoField = null;
            $setting->save();
        }

        return response()->json(['message' => 'Logo deleted successfully'], 200);
    }
}

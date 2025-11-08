<?php

namespace App\Support;

use App\Models\Setting;

class Branding
{
    /**
     * Retrieve branding data with sensible defaults.
     */
    public static function get(): array
    {
        $setting = Setting::where('key', 'crm_name')->first();

        $fallbackName = config('app.name', 'Daves RV Center CRM & DMS');

        return [
            'crm_name' => $setting->crm_name ?? $fallbackName,
            'logo_login' => $setting->logo_login ?? null,
            'logo_header' => $setting->logo_header ?? null,
            'logo_invoice' => $setting->logo_invoice ?? null,
            'business_name' => $setting->business_name ?? ($setting->crm_name ?? $fallbackName),
            'business_legal_name' => $setting->business_legal_name ?? null,
            'business_phone' => $setting->business_phone ?? null,
            'business_email' => $setting->business_email ?? null,
            'business_website' => $setting->business_website ?? null,
            'business_tax_id' => $setting->business_tax_id ?? null,
            'business_address_line1' => $setting->business_address_line1 ?? null,
            'business_address_line2' => $setting->business_address_line2 ?? null,
            'business_city' => $setting->business_city ?? null,
            'business_state' => $setting->business_state ?? null,
            'business_postal_code' => $setting->business_postal_code ?? null,
            'business_country' => $setting->business_country ?? null,
        ];
    }
}


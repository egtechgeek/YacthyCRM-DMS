<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quote {{ $quote->quote_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
        }
        .header {
            width: 100%;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .header td {
            vertical-align: top;
        }
        .header img {
            max-width: 220px;
            height: auto;
            display: block;
        }
        .header-details {
            text-align: right;
            font-size: 14px;
            line-height: 1.6;
        }
        .header-details .business-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 6px;
        }
        .quote-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-top: 12px;
        }
        .info-section {
            margin-bottom: 20px;
        }
        .info-label {
            font-weight: bold;
            margin-bottom: 5px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background-color: #333;
            color: white;
            padding: 10px;
            text-align: left;
        }
        td {
            padding: 8px;
            border-bottom: 1px solid #ddd;
        }
        .text-right {
            text-align: right;
        }
        .totals {
            margin-top: 20px;
            float: right;
            width: 300px;
        }
        .totals table {
            margin: 0;
        }
        .totals td {
            border: none;
            padding: 5px;
        }
        .total-row {
            font-weight: bold;
            font-size: 16px;
            border-top: 2px solid #333 !important;
        }
        .notes {
            clear: both;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
    </style>
</head>
<body>
    @php
        $logoCandidates = [
            $branding['logo_invoice'] ?? null,
            $branding['logo_header'] ?? null,
            $branding['logo_login'] ?? null,
        ];

        $logoSrc = null;
        foreach ($logoCandidates as $candidate) {
            if (!$candidate) {
                continue;
            }
            $candidatePath = storage_path('app/public/' . $candidate);
            if (file_exists($candidatePath)) {
                $logoData = base64_encode(file_get_contents($candidatePath));
                $extension = pathinfo($candidatePath, PATHINFO_EXTENSION) ?: 'png';
                $logoSrc = 'data:image/' . strtolower($extension) . ';base64,' . $logoData;
                break;
            }
        }
        $businessName = $branding['business_name'] ?? ($branding['crm_name'] ?? config('app.name'));
    @endphp

    <table width="100%" class="header" cellpadding="0" cellspacing="0">
        <tbody>
            <tr>
                <td width="45%" valign="top">
                    @if($logoSrc)
                        <img src="{{ $logoSrc }}" alt="{{ $businessName }} Logo" style="max-width: 220px; height: auto;">
                    @endif
                </td>
                <td width="55%" class="header-details">
                    @if(!empty($branding['business_legal_name']))
                        <div class="business-name">{{ $branding['business_legal_name'] }}</div>
                    @else
                        <div class="business-name">{{ $businessName }}</div>
                    @endif
                    @if(!empty($branding['business_address_line1']))
                        <div>{{ $branding['business_address_line1'] }}</div>
                    @endif
                    @if(!empty($branding['business_address_line2']))
                        <div>{{ $branding['business_address_line2'] }}</div>
                    @endif
                    @if(!empty($branding['business_city']) || !empty($branding['business_state']) || !empty($branding['business_postal_code']))
                        <div>
                            {{ $branding['business_city'] ?? '' }}
                            @if(!empty($branding['business_state']))
                                {{ !empty($branding['business_city']) ? ', ' : '' }}{{ $branding['business_state'] }}
                            @endif
                            @if(!empty($branding['business_postal_code']))
                                {{ (!empty($branding['business_city']) || !empty($branding['business_state'])) ? ' ' : '' }}{{ $branding['business_postal_code'] }}
                            @endif
                        </div>
                    @endif
                    @if(!empty($branding['business_country']))
                        <div>{{ $branding['business_country'] }}</div>
                    @endif
                    @if(!empty($branding['business_phone']))
                        <div>Phone: {{ $branding['business_phone'] }}</div>
                    @endif
                    @if(!empty($branding['business_website']))
                        <div>Web: {{ $branding['business_website'] }}</div>
                    @endif
                    @if(!empty($branding['business_tax_id']))
                        <div>Tax ID: {{ $branding['business_tax_id'] }}</div>
                    @endif

                    <div class="quote-title">QUOTE {{ $quote->quote_number }}</div>
                </td>
            </tr>
        </tbody>
    </table>

    @php
        $customer = $quote->customer;
        $billAddress = $customer->billing_address ?: $customer->address;
        $billCity = $customer->billing_city ?: $customer->city;
        $billState = $customer->billing_state ?: $customer->state;
        $billZip = $customer->billing_zip ?: $customer->zip;
        $billCountry = $customer->billing_country ?: $customer->country;
    @endphp

    <table width="100%" class="info-section" cellpadding="0" cellspacing="0">
        <tbody>
            <tr>
                <td width="55%" valign="top">
                    <div class="info-label">Bill To:</div>
                    <div><strong>{{ $customer->name }}</strong></div>
                    @if(!empty($billAddress))
                        <div>{{ $billAddress }}</div>
                    @endif
                    @if(!empty($billCity) || !empty($billState) || !empty($billZip))
                        <div>
                            @if($billCity) {{ $billCity }}@endif
                            @if($billState){{ $billCity ? ', ' : '' }}{{ $billState }}@endif
                            @if($billZip) {{ ($billCity || $billState) ? ' ' : '' }}{{ $billZip }}@endif
                        </div>
                    @endif
                    @if(!empty($billCountry))
                        <div>{{ $billCountry }}</div>
                    @endif
                    @if($customer->email)
                        <div>{{ $customer->email }}</div>
                    @endif
                    @if($customer->phone)
                        <div>{{ $customer->phone }}</div>
                    @endif
                </td>
                <td width="45%" valign="top" align="right">
                    <div class="info-label">Quote Details:</div>
                    <div><strong>Quote #:</strong> {{ $quote->quote_number }}</div>
                    <div><strong>Date:</strong> {{ \Carbon\Carbon::parse($quote->created_at)->format('m/d/Y') }}</div>
                    @if($quote->expiration_date)
                        <div><strong>Expires:</strong> {{ \Carbon\Carbon::parse($quote->expiration_date)->format('m/d/Y') }}</div>
                    @endif
                    @if($quote->vehicle)
                        <div><strong>Vehicle:</strong> {{ implode(' ', array_filter([$quote->vehicle->year, $quote->vehicle->make, $quote->vehicle->model])) ?: ($quote->vehicle->name ?? 'N/A') }}</div>
                        @if($quote->vehicle->vin)
                            <div><strong>VIN:</strong> {{ $quote->vehicle->vin }}</div>
                        @endif
                        @if($quote->vehicle->coach_number)
                            <div><strong>Coach #:</strong> {{ $quote->vehicle->coach_number }}</div>
                        @endif
                    @elseif($quote->yacht)
                        <div><strong>Yacht:</strong> {{ $quote->yacht->name }}</div>
                        @if($quote->yacht->hull_identification_number)
                            <div><strong>HIN:</strong> {{ $quote->yacht->hull_identification_number }}</div>
                        @endif
                    @endif
                    <div><strong>Status:</strong> {{ ucfirst($quote->status) }}</div>
                </td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Discount</th>
                <th class="text-right">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($quote->items as $item)
                <tr>
                    <td>{{ $item->description }}</td>
                    <td class="text-right">{{ number_format($item->quantity, 2) }}</td>
                    <td class="text-right">${{ number_format($item->unit_price, 2) }}</td>
                    <td class="text-right">${{ number_format($item->discount, 2) }}</td>
                    <td class="text-right">${{ number_format($item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td class="text-right">${{ number_format($quote->subtotal, 2) }}</td>
            </tr>
            @if($quote->tax_rate > 0)
                <tr>
                    <td>Tax ({{ $quote->tax_rate }}%):</td>
                    <td class="text-right">${{ number_format($quote->tax_amount, 2) }}</td>
                </tr>
            @endif
            <tr class="total-row">
                <td>Total:</td>
                <td class="text-right">${{ number_format($quote->total, 2) }}</td>
            </tr>
        </table>
    </div>

        <div class="notes">
            <div class="info-label">Notes:</div>
        <div>Thank you for the business opportunity!</div>
        <div style="margin-top: 4px;">
            If you haven't already done so, <a href="https://crm.captainellenbogen.com/frontend/register" target="_blank">Register</a>
            at https://crm.captainellenbogen.com/frontend/register for paperless billing, account management, and convenient access to service records.
        </div>
            @if($quote->notes)
                <div style="margin-top: 10px;">{{ $quote->notes }}</div>
            @endif
        </div>
</body>
</html>


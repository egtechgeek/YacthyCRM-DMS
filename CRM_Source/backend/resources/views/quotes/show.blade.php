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
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .company-info {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .quote-title {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .info-section {
            display: table;
            width: 100%;
            margin-bottom: 20px;
        }
        .info-left, .info-right {
            display: table-cell;
            width: 50%;
            vertical-align: top;
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
    <div class="header">
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

        @if($logoSrc)
            <img src="{{ $logoSrc }}" alt="{{ $businessName }} Logo" style="max-width: 220px; height: auto; display: block; margin-bottom: 10px;">
        @endif

        <div class="company-info">{{ $businessName }}</div>
        @if(!empty($branding['business_legal_name']))
            <div>{{ $branding['business_legal_name'] }}</div>
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
        @if(!empty($branding['business_phone']) || !empty($branding['business_email']) || !empty($branding['business_website']))
            <div style="margin-top: 5px; font-size: 14px; font-weight: normal;">
                @if(!empty($branding['business_phone']))
                    <span>Phone: {{ $branding['business_phone'] }}</span>
                @endif
                @if(!empty($branding['business_email']))
                    <span style="margin-left: 10px;">Email: {{ $branding['business_email'] }}</span>
                @endif
                @if(!empty($branding['business_website']))
                    <span style="margin-left: 10px;">Web: {{ $branding['business_website'] }}</span>
                @endif
            </div>
        @endif
        @if(!empty($branding['business_tax_id']))
            <div style="font-size: 14px; font-weight: normal;">Tax ID: {{ $branding['business_tax_id'] }}</div>
        @endif

        <div class="quote-title">QUOTE {{ $quote->quote_number }}</div>
    </div>

    <div class="info-section">
        <div class="info-left">
            <div class="info-label">Bill To:</div>
            <div><strong>{{ $quote->customer->name }}</strong></div>
            @if($quote->customer->email)
                <div>{{ $quote->customer->email }}</div>
            @endif
            @if($quote->customer->phone)
                <div>{{ $quote->customer->phone }}</div>
            @endif
            @if($quote->customer->billing_address)
                <div>{{ $quote->customer->billing_address }}</div>
            @endif
            @if($quote->customer->billing_city || $quote->customer->billing_state || $quote->customer->billing_zip)
                <div>
                    @if($quote->customer->billing_city) {{ $quote->customer->billing_city }}@endif
                    @if($quote->customer->billing_state){{ $quote->customer->billing_city ? ', ' : '' }}{{ $quote->customer->billing_state }}@endif
                    @if($quote->customer->billing_zip) {{ ($quote->customer->billing_city || $quote->customer->billing_state) ? ' ' : '' }}{{ $quote->customer->billing_zip }}@endif
                </div>
            @endif
        </div>
        <div class="info-right">
            <div class="info-label">Quote Details:</div>
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
        </div>
    </div>

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

    @if($quote->notes)
        <div class="notes">
            <div class="info-label">Notes:</div>
            <div>{{ $quote->notes }}</div>
        </div>
    @endif
</body>
</html>


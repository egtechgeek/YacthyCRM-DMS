<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            width: 100%;
            margin-bottom: 30px;
        }
        .header td {
            vertical-align: top;
        }
        .header img {
            max-width: 260px;
            height: auto;
            display: block;
        }
        .header-details {
            text-align: right;
            font-size: 14px;
            line-height: 1.6;
        }
        .header-details .business-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .invoice-info {
            margin-bottom: 30px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .totals {
            text-align: right;
            margin-top: 20px;
        }
        .totals table {
            width: 300px;
            margin-left: auto;
        }
        .totals td {
            padding: 5px 10px;
        }
        .totals .total-row {
            font-weight: bold;
            font-size: 1.1em;
            border-top: 2px solid #333;
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
                        <img src="{{ $logoSrc }}" alt="{{ $businessName }} Logo" style="max-width: 260px; height: auto;">
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
                </td>
            </tr>
        </tbody>
    </table>

    @php
        $customer = $invoice->customer;
        $billAddress = $customer->billing_address ?: $customer->address;
        $billCity = $customer->billing_city ?: $customer->city;
        $billState = $customer->billing_state ?: $customer->state;
        $billZip = $customer->billing_zip ?: $customer->zip;
        $billCountry = $customer->billing_country ?: $customer->country;
    @endphp

    <table width="100%" class="invoice-info" cellpadding="0" cellspacing="0">
        <tbody>
            <tr>
                <td width="55%" valign="top">
                    <h3>Bill To:</h3>
                    <p><strong>{{ $customer->name }}</strong></p>
                    @if(!empty($billAddress))
                    <p>{{ $billAddress }}</p>
                    @endif
                    @if(!empty($billCity) || !empty($billState) || !empty($billZip))
                    <p>
                        {{ $billCity ?? '' }}
                        @if(!empty($billState))
                            {{ !empty($billCity) ? ', ' : '' }}{{ $billState }}
                        @endif
                        @if(!empty($billZip))
                            {{ (!empty($billCity) || !empty($billState)) ? ' ' : '' }}{{ $billZip }}
                        @endif
                    </p>
                    @endif
                    @if(!empty($billCountry))
                    <p>{{ $billCountry }}</p>
                    @endif
                    @if($customer->email)
                    <p>{{ $customer->email }}</p>
                    @endif
                    @if($customer->phone)
                    <p>{{ $customer->phone }}</p>
                    @endif
                </td>
                <td width="45%" valign="top" align="right">
                    <h2>Invoice #{{ $invoice->invoice_number }}</h2>
                    <p><strong>Issue Date:</strong> {{ $invoice->issue_date->format('F j, Y') }}</p>
                    <p><strong>Due Date:</strong> {{ $invoice->due_date->format('F j, Y') }}</p>
                    @if($invoice->vehicle)
                    <p>
                        <strong>Vehicle:</strong>
                        {{ implode(' ', array_filter([$invoice->vehicle->year, $invoice->vehicle->make, $invoice->vehicle->model])) ?: ($invoice->vehicle->name ?? 'N/A') }}
                    </p>
                    @if(!empty($invoice->vehicle->vin))
                    <p><strong>VIN:</strong> {{ $invoice->vehicle->vin }}</p>
                    @endif
                    @if(!empty($invoice->vehicle->coach_number))
                    <p><strong>Coach #:</strong> {{ $invoice->vehicle->coach_number }}</p>
                    @endif
                    @elseif($invoice->yacht)
                    <p><strong>Yacht:</strong> {{ $invoice->yacht->name }}</p>
                    @if(!empty($invoice->yacht->hull_identification_number))
                    <p><strong>HIN:</strong> {{ $invoice->yacht->hull_identification_number }}</p>
                    @endif
                    @endif
                </td>
            </tr>
        </tbody>
    </table>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($invoice->items as $item)
            <tr>
                <td>{{ $item->description }}</td>
                <td>{{ $item->quantity }}</td>
                <td>${{ number_format($item->unit_price, 2) }}</td>
                <td>${{ number_format($item->discount, 2) }}</td>
                <td>${{ number_format($item->total, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td>${{ number_format($invoice->subtotal, 2) }}</td>
            </tr>
            @if($invoice->tax_rate > 0)
            <tr>
                <td>Tax ({{ number_format($invoice->tax_rate, 2) }}%):</td>
                <td>${{ number_format($invoice->tax_amount, 2) }}</td>
            </tr>
            @endif
            <tr class="total-row">
                <td>Total:</td>
                <td>${{ number_format($invoice->total, 2) }}</td>
            </tr>
            @if($invoice->paid_amount > 0)
            <tr>
                <td>Paid:</td>
                <td>${{ number_format($invoice->paid_amount, 2) }}</td>
            </tr>
            <tr class="total-row">
                <td>Balance:</td>
                <td>${{ number_format($invoice->balance, 2) }}</td>
            </tr>
            @endif
        </table>
    </div>

    <div style="margin-top: 30px;">
        <h3>Notes:</h3>
        <p>Thank you for your business!</p>
        <p>
            If you haven't already done so, <a href="https://crm.captainellenbogen.com/frontend/register" target="_blank">Register</a>
            at https://crm.captainellenbogen.com/frontend/register for paperless billing, account management, and convenient access to service records.
        </p>
        @if($invoice->notes)
            <p style="margin-top: 10px;">{{ $invoice->notes }}</p>
        @endif
    </div>
</body>
</html>


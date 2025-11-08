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
            margin-bottom: 30px;
            text-align: center;
        }
        .header img {
            max-width: 300px;
            height: auto;
            display: block;
            margin: 0 auto;
        }
        .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .invoice-details {
            width: 48%;
        }
        .customer-details {
            width: 48%;
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
            <img src="{{ $logoSrc }}" alt="{{ $businessName }} Logo" style="max-width: 300px; height: auto;">
        @endif

        <div style="margin-top: 15px; font-size: 14px;">
            <div style="font-size: 20px; font-weight: bold;">{{ $businessName }}</div>
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
                <div style="margin-top: 8px;">
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
                <div style="margin-top: 5px;">Tax ID: {{ $branding['business_tax_id'] }}</div>
            @endif
        </div>
    </div>

    <div class="invoice-info">
        <div class="invoice-details">
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
        </div>
        <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong>{{ $invoice->customer->name }}</strong></p>
            @if(!empty($invoice->customer->billing_address))
            <p>{{ $invoice->customer->billing_address }}</p>
            @endif
            @if(!empty($invoice->customer->billing_city) || !empty($invoice->customer->billing_state) || !empty($invoice->customer->billing_zip))
            <p>
                {{ $invoice->customer->billing_city ?? '' }}
                @if(!empty($invoice->customer->billing_state))
                    {{ !empty($invoice->customer->billing_city) ? ', ' : '' }}{{ $invoice->customer->billing_state }}
                @endif
                @if(!empty($invoice->customer->billing_zip))
                    {{ (!empty($invoice->customer->billing_city) || !empty($invoice->customer->billing_state)) ? ' ' : '' }}{{ $invoice->customer->billing_zip }}
                @endif
            </p>
            @endif
            @if($invoice->customer->email)
            <p>{{ $invoice->customer->email }}</p>
            @endif
            @if($invoice->customer->phone)
            <p>{{ $invoice->customer->phone }}</p>
            @endif
        </div>
    </div>

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

    @if($invoice->notes)
    <div style="margin-top: 30px;">
        <h3>Notes:</h3>
        <p>{{ $invoice->notes }}</p>
    </div>
    @endif
</body>
</html>


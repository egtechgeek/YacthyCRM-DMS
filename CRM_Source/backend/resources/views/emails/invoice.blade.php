<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->invoice_number }}</title>
</head>
<body>
    <h2>Invoice {{ $invoice->invoice_number }}</h2>
    <p>Dear {{ $invoice->customer->name }},</p>
    
    {!! $body !!}
    
    <p><strong>Invoice Total:</strong> ${{ number_format($invoice->total, 2) }}</p>
    <p><strong>Due Date:</strong> {{ $invoice->due_date->format('F j, Y') }}</p>
    <p><strong>Balance:</strong> ${{ number_format($invoice->balance, 2) }}</p>
    
    <p>Please find the invoice attached to this email.</p>
    
    <p>Thank you for your business!</p>
</body>
</html>


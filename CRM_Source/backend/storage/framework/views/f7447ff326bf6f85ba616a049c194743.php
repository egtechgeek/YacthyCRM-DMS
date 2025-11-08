<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice <?php echo e($invoice->invoice_number); ?></title>
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
        <?php
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

            if (!$logoSrc) {
                $fallbackPath = public_path('images/logo_full.png');
                if (file_exists($fallbackPath)) {
                    $logoData = base64_encode(file_get_contents($fallbackPath));
                    $logoSrc = 'data:image/png;base64,' . $logoData;
                }
            }

            $businessName = $branding['business_name'] ?? ($branding['crm_name'] ?? config('app.name'));
        ?>

        <?php if($logoSrc): ?>
            <img src="<?php echo e($logoSrc); ?>" alt="<?php echo e($businessName); ?> Logo" style="max-width: 300px; height: auto;">
        <?php endif; ?>

        <div style="margin-top: 15px; font-size: 14px;">
            <div style="font-size: 20px; font-weight: bold;"><?php echo e($businessName); ?></div>
            <?php if(!empty($branding['business_legal_name'])): ?>
                <div><?php echo e($branding['business_legal_name']); ?></div>
            <?php endif; ?>
            <?php if(!empty($branding['business_address_line1'])): ?>
                <div><?php echo e($branding['business_address_line1']); ?></div>
            <?php endif; ?>
            <?php if(!empty($branding['business_address_line2'])): ?>
                <div><?php echo e($branding['business_address_line2']); ?></div>
            <?php endif; ?>
            <?php if(!empty($branding['business_city']) || !empty($branding['business_state']) || !empty($branding['business_postal_code'])): ?>
                <div>
                    <?php echo e($branding['business_city'] ?? ''); ?>

                    <?php if(!empty($branding['business_state'])): ?>
                        <?php echo e(!empty($branding['business_city']) ? ', ' : ''); ?><?php echo e($branding['business_state']); ?>

                    <?php endif; ?>
                    <?php if(!empty($branding['business_postal_code'])): ?>
                        <?php echo e((!empty($branding['business_city']) || !empty($branding['business_state'])) ? ' ' : ''); ?><?php echo e($branding['business_postal_code']); ?>

                    <?php endif; ?>
                </div>
            <?php endif; ?>
            <?php if(!empty($branding['business_country'])): ?>
                <div><?php echo e($branding['business_country']); ?></div>
            <?php endif; ?>
            <?php if(!empty($branding['business_phone']) || !empty($branding['business_email']) || !empty($branding['business_website'])): ?>
                <div style="margin-top: 8px;">
                    <?php if(!empty($branding['business_phone'])): ?>
                        <span>Phone: <?php echo e($branding['business_phone']); ?></span>
                    <?php endif; ?>
                    <?php if(!empty($branding['business_email'])): ?>
                        <span style="margin-left: 10px;">Email: <?php echo e($branding['business_email']); ?></span>
                    <?php endif; ?>
                    <?php if(!empty($branding['business_website'])): ?>
                        <span style="margin-left: 10px;">Web: <?php echo e($branding['business_website']); ?></span>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
            <?php if(!empty($branding['business_tax_id'])): ?>
                <div style="margin-top: 5px;">Tax ID: <?php echo e($branding['business_tax_id']); ?></div>
            <?php endif; ?>
        </div>
    </div>

    <div class="invoice-info">
        <div class="invoice-details">
            <h2>Invoice #<?php echo e($invoice->invoice_number); ?></h2>
            <p><strong>Issue Date:</strong> <?php echo e($invoice->issue_date->format('F j, Y')); ?></p>
            <p><strong>Due Date:</strong> <?php echo e($invoice->due_date->format('F j, Y')); ?></p>
            <?php if($invoice->vehicle): ?>
            <p>
                <strong>Vehicle:</strong>
                <?php echo e(implode(' ', array_filter([$invoice->vehicle->year, $invoice->vehicle->make, $invoice->vehicle->model])) ?: ($invoice->vehicle->name ?? 'N/A')); ?>

            </p>
            <?php if(!empty($invoice->vehicle->vin)): ?>
            <p><strong>VIN:</strong> <?php echo e($invoice->vehicle->vin); ?></p>
            <?php endif; ?>
            <?php if(!empty($invoice->vehicle->coach_number)): ?>
            <p><strong>Coach #:</strong> <?php echo e($invoice->vehicle->coach_number); ?></p>
            <?php endif; ?>
            <?php elseif($invoice->yacht): ?>
            <p><strong>Yacht:</strong> <?php echo e($invoice->yacht->name); ?></p>
            <?php if(!empty($invoice->yacht->hull_identification_number)): ?>
            <p><strong>HIN:</strong> <?php echo e($invoice->yacht->hull_identification_number); ?></p>
            <?php endif; ?>
            <?php endif; ?>
        </div>
        <div class="customer-details">
            <h3>Bill To:</h3>
            <p><strong><?php echo e($invoice->customer->name); ?></strong></p>
            <?php if(!empty($invoice->customer->billing_address)): ?>
            <p><?php echo e($invoice->customer->billing_address); ?></p>
            <?php endif; ?>
            <?php if(!empty($invoice->customer->billing_city) || !empty($invoice->customer->billing_state) || !empty($invoice->customer->billing_zip)): ?>
            <p>
                <?php echo e($invoice->customer->billing_city ?? ''); ?>

                <?php if(!empty($invoice->customer->billing_state)): ?>
                    <?php echo e(!empty($invoice->customer->billing_city) ? ', ' : ''); ?><?php echo e($invoice->customer->billing_state); ?>

                <?php endif; ?>
                <?php if(!empty($invoice->customer->billing_zip)): ?>
                    <?php echo e((!empty($invoice->customer->billing_city) || !empty($invoice->customer->billing_state)) ? ' ' : ''); ?><?php echo e($invoice->customer->billing_zip); ?>

                <?php endif; ?>
            </p>
            <?php endif; ?>
            <?php if($invoice->customer->email): ?>
            <p><?php echo e($invoice->customer->email); ?></p>
            <?php endif; ?>
            <?php if($invoice->customer->phone): ?>
            <p><?php echo e($invoice->customer->phone); ?></p>
            <?php endif; ?>
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
            <?php $__currentLoopData = $invoice->items; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><?php echo e($item->description); ?></td>
                <td><?php echo e($item->quantity); ?></td>
                <td>$<?php echo e(number_format($item->unit_price, 2)); ?></td>
                <td>$<?php echo e(number_format($item->discount, 2)); ?></td>
                <td>$<?php echo e(number_format($item->total, 2)); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td>$<?php echo e(number_format($invoice->subtotal, 2)); ?></td>
            </tr>
            <?php if($invoice->tax_rate > 0): ?>
            <tr>
                <td>Tax (<?php echo e(number_format($invoice->tax_rate, 2)); ?>%):</td>
                <td>$<?php echo e(number_format($invoice->tax_amount, 2)); ?></td>
            </tr>
            <?php endif; ?>
            <tr class="total-row">
                <td>Total:</td>
                <td>$<?php echo e(number_format($invoice->total, 2)); ?></td>
            </tr>
            <?php if($invoice->paid_amount > 0): ?>
            <tr>
                <td>Paid:</td>
                <td>$<?php echo e(number_format($invoice->paid_amount, 2)); ?></td>
            </tr>
            <tr class="total-row">
                <td>Balance:</td>
                <td>$<?php echo e(number_format($invoice->balance, 2)); ?></td>
            </tr>
            <?php endif; ?>
        </table>
    </div>

    <?php if($invoice->notes): ?>
    <div style="margin-top: 30px;">
        <h3>Notes:</h3>
        <p><?php echo e($invoice->notes); ?></p>
    </div>
    <?php endif; ?>
</body>
</html>

<?php /**PATH /var/www/vhosts/south.davesrvcenter.com/crm.davesrvcenter.com/backend/resources/views/invoices/show.blade.php ENDPATH**/ ?>
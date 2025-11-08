<?php
/**
 * InvoicePlane to CRM Export Script
 * 
 * This script connects to your InvoicePlane database and exports data in the format
 * needed for the CRM import function.
 * 
 * USAGE:
 * 1. Visit: https://crm.captainellenbogen.com/backend/invoiceplane-export.php
 * 2. Click "Export Data"
 * 3. Download the JSON file
 * 4. Go to CRM Import page and upload the file
 * 5. DELETE THIS FILE after use for security!
 */

// Load Laravel to get database credentials
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// InvoicePlane database connection (adjust if needed)
$ipDbName = 'captainari_invoiceplane'; // Change if different
$dbHost = 'localhost';
$dbUser = 'captainari_yacht_crm'; // Usually same as CRM
$dbPass = 'DD7Kfrf?z!am0q6o'; // Usually same as CRM

$message = '';
$error = '';

if (isset($_GET['export'])) {
    try {
        $pdo = new PDO("mysql:host=$dbHost;dbname=$ipDbName", $dbUser, $dbPass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Export customers
        $customers = $pdo->query("
            SELECT 
                client_id,
                client_name,
                client_surname,
                client_email,
                client_phone,
                client_mobile,
                client_address_1,
                client_address_2,
                client_city,
                client_state,
                client_zip,
                client_country
            FROM ip_clients 
            WHERE client_active = 1
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Export invoices with items
        $invoices = $pdo->query("
            SELECT 
                i.invoice_id,
                i.client_id,
                i.invoice_number,
                i.invoice_status_id,
                i.invoice_date_created,
                i.invoice_date_due,
                i.invoice_item_subtotal,
                i.invoice_tax_rate_percent,
                i.invoice_item_tax_total,
                i.invoice_total,
                i.invoice_paid,
                i.invoice_terms,
                i.invoice_url_key
            FROM ip_invoices i
            ORDER BY i.invoice_date_created DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Get items for each invoice
        foreach ($invoices as &$invoice) {
            $stmt = $pdo->prepare("
                SELECT 
                    item_name,
                    item_description,
                    item_quantity,
                    item_price,
                    item_discount_amount,
                    item_subtotal
                FROM ip_invoice_items
                WHERE invoice_id = ?
            ");
            $stmt->execute([$invoice['invoice_id']]);
            $invoice['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        // Export quotes with items
        $quotes = $pdo->query("
            SELECT 
                q.quote_id,
                q.client_id,
                q.quote_number,
                q.quote_status_id,
                q.quote_date_expires,
                q.quote_item_subtotal,
                q.quote_tax_rate_percent,
                q.quote_item_tax_total,
                q.quote_total,
                q.quote_terms
            FROM ip_quotes q
            ORDER BY q.quote_date_created DESC
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Get items for each quote
        foreach ($quotes as &$quote) {
            $stmt = $pdo->prepare("
                SELECT 
                    item_name,
                    item_description,
                    item_quantity,
                    item_price,
                    item_discount_amount,
                    item_subtotal
                FROM ip_quote_items
                WHERE quote_id = ?
            ");
            $stmt->execute([$quote['quote_id']]);
            $quote['items'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $exportData = [
            'customers' => $customers,
            'quotes' => $quotes,
            'invoices' => $invoices,
            'exported_at' => date('Y-m-d H:i:s'),
            'total_customers' => count($customers),
            'total_quotes' => count($quotes),
            'total_invoices' => count($invoices),
        ];

        // Output as downloadable JSON
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="invoiceplane_export_' . date('Y-m-d_His') . '.json"');
        echo json_encode($exportData, JSON_PRETTY_PRINT);
        exit;

    } catch (Exception $e) {
        $error = 'Export failed: ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>InvoicePlane Export</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-top: 0; }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            color: #856404;
        }
        .error {
            background: #f8d7da;
            border: 1px solid #dc3545;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            color: #721c24;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #17a2b8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            color: #0c5460;
        }
        .btn {
            background: #007bff;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
        }
        .btn:hover { background: #0056b3; }
        code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
        }
        pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>InvoicePlane Data Export</h1>

        <div class="warning">
            <strong>⚠️ SECURITY WARNING:</strong> Delete this file immediately after use!<br>
            This file has direct database access and should not remain on a public server.
        </div>

        <?php if ($error): ?>
            <div class="error">
                <strong>Error:</strong> <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <div class="info">
            <h3>Instructions:</h3>
            <ol>
                <li>Click the "Export Data" button below</li>
                <li>Download the JSON file</li>
                <li>Go to the CRM Import page: <code>/frontend/import</code></li>
                <li>Upload the downloaded JSON file</li>
                <li><strong>Delete this script!</strong></li>
            </ol>
        </div>

        <h3>Database Configuration:</h3>
        <p>Database: <code><?= htmlspecialchars($ipDbName) ?></code></p>
        <p><small>If this is incorrect, edit line 19 in this file</small></p>

        <div style="margin-top: 30px;">
            <a href="?export=1" class="btn">📥 Export InvoicePlane Data to JSON</a>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <h3>After Exporting:</h3>
            <p>Delete this file for security:</p>
            <pre>rm <?= __FILE__ ?></pre>
        </div>
    </div>
</body>
</html>


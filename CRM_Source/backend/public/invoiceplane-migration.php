<?php
/**
 * InvoicePlane SQL Dump Migration Tool
 * 
 * Upload your InvoicePlane SQL dump and import directly without needing database creation permissions.
 * 
 * SECURITY: DELETE THIS FILE IMMEDIATELY AFTER USE!
 */

session_start();
ini_set('memory_limit', '512M');
set_time_limit(300);

// Script version - increment this when logic changes
define('MIGRATION_VERSION', 3);

// Check if session data is from old version
if (isset($_SESSION['migration_version']) && $_SESSION['migration_version'] < MIGRATION_VERSION) {
    // Clear old session data
    unset($_SESSION['parsed_data']);
    unset($_SESSION['preview']);
    $_SESSION['migration_version'] = MIGRATION_VERSION;
}

// Load Laravel
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Part;
use App\Models\Service;

$error = '';
$message = '';
$step = $_POST['step'] ?? 'upload';

/**
 * Parse SQL dump and extract INSERT data
 * Handles both formats:
 * - INSERT INTO table (col1, col2) VALUES (...)
 * - INSERT INTO table VALUES (...)
 */
function parseSqlDump($sqlContent, $tableName) {
    $data = [];
    
    // First, try to get column names from CREATE TABLE statement
    $columns = [];
    $createPattern = "/CREATE TABLE [`'\"]?{$tableName}[`'\"]?\s*\((.*?)\)\s*ENGINE/is";
    if (preg_match($createPattern, $sqlContent, $createMatch)) {
        $columnDefs = $createMatch[1];
        // Extract column names (skip KEY, CONSTRAINT, etc.)
        preg_match_all("/^\s*[`'\"]?(\w+)[`'\"]?\s+/m", $columnDefs, $colMatches);
        $columns = array_filter($colMatches[1], function($col) {
            return !in_array(strtoupper($col), ['KEY', 'PRIMARY', 'UNIQUE', 'CONSTRAINT', 'INDEX', 'FOREIGN']);
        });
        $columns = array_values($columns);
    }
    
    // Find INSERT statements - match both with and without column spec
    $insertPattern = "/INSERT INTO [`'\"]?{$tableName}[`'\"]?(?:\s*\([^)]+\))?\s+VALUES\s+(.*?);/is";
    
    if (preg_match_all($insertPattern, $sqlContent, $matches)) {
        foreach ($matches[1] as $valuesString) {
            // Split by "),(" to handle multiple value sets
            $valueRows = preg_split("/\),\s*\(/s", $valuesString);
            
            foreach ($valueRows as $rowStr) {
                // Clean up
                $rowStr = trim($rowStr, "() \n\r\t");
                
                // Split values by comma, but respect quotes
                $values = [];
                $current = '';
                $inQuote = false;
                $quoteChar = '';
                $escaped = false;
                
                for ($i = 0; $i < strlen($rowStr); $i++) {
                    $char = $rowStr[$i];
                    
                    if ($escaped) {
                        $current .= $char;
                        $escaped = false;
                        continue;
                    }
                    
                    if ($char === '\\') {
                        $escaped = true;
                        continue;
                    }
                    
                    if (($char === "'" || $char === '"') && !$inQuote) {
                        $inQuote = true;
                        $quoteChar = $char;
                        continue;
                    } elseif ($char === $quoteChar && $inQuote) {
                        $inQuote = false;
                        continue;
                    } elseif ($char === ',' && !$inQuote) {
                        $values[] = $current;
                        $current = '';
                        continue;
                    }
                    
                    $current .= $char;
                }
                // Don't forget the last value
                $values[] = $current;
                
                // Clean up values
                $values = array_map(function($v) {
                    $v = trim($v);
                    if ($v === 'NULL' || $v === '') return null;
                    return $v;
                }, $values);
                
                // Combine with columns if we have them
                if (!empty($columns) && count($values) === count($columns)) {
                    $row = array_combine($columns, $values);
                    $data[] = $row;
                } elseif (!empty($values)) {
                    // If we don't have exact column count, store as numeric array
                    $data[] = $values;
                }
            }
        }
    }
    
    return $data;
}

// Step 1: Upload and parse SQL dump
if ($step === 'upload' && isset($_FILES['sql_dump'])) {
    try {
        $file = $_FILES['sql_dump'];
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload failed with error code: ' . $file['error']);
        }

        // Read SQL file
        $sqlContent = file_get_contents($file['tmp_name']);
        if ($sqlContent === false) {
            throw new Exception('Failed to read SQL file');
        }
        
        if (empty($sqlContent)) {
            throw new Exception('SQL file is empty');
        }

        // Parse data from SQL
        $customers = parseSqlDump($sqlContent, 'ip_clients');
        $invoices = parseSqlDump($sqlContent, 'ip_invoices');
        $invoiceItems = parseSqlDump($sqlContent, 'ip_invoice_items');
        $quotes = parseSqlDump($sqlContent, 'ip_quotes');
        $quoteItems = parseSqlDump($sqlContent, 'ip_quote_items');
        $products = parseSqlDump($sqlContent, 'ip_products');
        
        // Debug: Log what was parsed
        error_log('Parsed customers: ' . count($customers));
        error_log('Parsed invoices: ' . count($invoices));
        error_log('Parsed quotes: ' . count($quotes));
        error_log('Parsed products: ' . count($products));

        // Group items with their parent records
        $invoiceItemsGrouped = [];
        foreach ($invoiceItems as $item) {
            $invoiceItemsGrouped[$item['invoice_id']][] = $item;
        }

        $quoteItemsGrouped = [];
        foreach ($quoteItems as $item) {
            $quoteItemsGrouped[$item['quote_id']][] = $item;
        }

        // Filter active customers only
        $activeCustomers = array_filter($customers, function($c) {
            return isset($c['client_active']) && $c['client_active'] == 1;
        });

        // Get sample data
        $sampleCustomers = array_slice($activeCustomers, 0, 5);
        $sampleInvoices = array_slice($invoices, 0, 5);

        $_SESSION['parsed_data'] = [
            'customers' => $activeCustomers,
            'invoices' => $invoices,
            'invoice_items' => $invoiceItemsGrouped,
            'quotes' => $quotes,
            'quote_items' => $quoteItemsGrouped,
            'products' => $products,
        ];

        $_SESSION['preview'] = [
            'customer_count' => count($activeCustomers),
            'invoice_count' => count($invoices),
            'quote_count' => count($quotes),
            'product_count' => count($products),
            'sample_customers' => $sampleCustomers,
            'sample_invoices' => $sampleInvoices,
        ];
        
        $_SESSION['migration_version'] = MIGRATION_VERSION;
        
        // Force session save
        session_write_close();
        session_start();
        
        $step = 'preview';
        $message = 'SQL file parsed successfully! Found ' . count($activeCustomers) . ' customers, ' . count($invoices) . ' invoices, ' . count($quotes) . ' quotes, ' . count($products) . ' products/services.';
        
    } catch (Exception $e) {
        $error = 'Upload/Parse Error: ' . $e->getMessage();
        error_log('InvoicePlane migration error: ' . $e->getMessage());
        error_log('Stack trace: ' . $e->getTraceAsString());
    }
}

// Step 2: Perform migration
if ($step === 'migrate' && isset($_POST['import_types'])) {
    try {
        $importTypes = $_POST['import_types'];
        $results = [];
        $parsedData = $_SESSION['parsed_data'] ?? null;
        
        if (!$parsedData) {
            throw new Exception('No data found. Please upload the SQL dump again.');
        }
        
        // Import Customers
        if (in_array('customers', $importTypes)) {
            $imported = 0;
            $errors = [];
            $mapping = [];
            
            foreach ($parsedData['customers'] as $client) {
                try {
                    $email = $client['client_email'] ?: 'noemail_' . $client['client_id'] . '@imported.local';
                    
                    // Check if customer already exists
                    $existing = Customer::where('email', $email)->first();
                    if ($existing) {
                        $mapping[$client['client_id']] = $existing->id;
                        continue;
                    }
                    
                    $name = trim(($client['client_name'] ?? '') . ' ' . ($client['client_surname'] ?? ''));
                    if (empty($name)) {
                        $name = 'Imported Customer ' . $client['client_id'];
                    }
                    
                    $customer = Customer::create([
                        'name' => $name,
                        'email' => $email,
                        'phone' => $client['client_phone'] ?? $client['client_mobile'] ?? null,
                        'address' => $client['client_address_1'] ?? null,
                        'city' => $client['client_city'] ?? null,
                        'state' => $client['client_state'] ?? null,
                        'zip' => $client['client_zip'] ?? null,
                        'country' => $client['client_country'] ?? 'USA',
                        'notes' => $client['client_notes'] ?? null,
                    ]);
                    
                    $mapping[$client['client_id']] = $customer->id;
                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Customer {$client['client_name']}: " . $e->getMessage();
                }
            }
            
            $_SESSION['customer_mapping'] = $mapping;
            $results['customers'] = [
                'imported' => $imported, 
                'errors' => count($errors), 
                'error_details' => $errors,
                'skipped' => count($parsedData['customers']) - $imported - count($errors)
            ];
        }
        
        // Import Invoices
        if (in_array('invoices', $importTypes)) {
            $mapping = $_SESSION['customer_mapping'] ?? [];
            
            // If no mapping in session, rebuild from existing customers
            if (empty($mapping)) {
                $existingCustomers = Customer::all();
                foreach ($parsedData['customers'] ?? [] as $client) {
                    $email = $client['client_email'] ?: 'noemail_' . $client['client_id'] . '@imported.local';
                    $existing = $existingCustomers->firstWhere('email', $email);
                    if ($existing) {
                        $mapping[$client['client_id']] = $existing->id;
                    }
                }
                $_SESSION['customer_mapping'] = $mapping;
            }
            
            if (empty($mapping) && !empty($parsedData['invoices'])) {
                throw new Exception('No customer mapping found. Please check the "Customers" box to rebuild mapping (duplicates will be skipped).');
            }
            
            $imported = 0;
            $errors = [];
            
            foreach ($parsedData['invoices'] as $inv) {
                try {
                    if (!isset($mapping[$inv['client_id']])) {
                        $errors[] = "Invoice {$inv['invoice_number']}: Customer not found (client_id: {$inv['client_id']})";
                        continue;
                    }
                    
                    // Map status
                    $statusMap = [1 => 'draft', 2 => 'sent', 3 => 'sent', 4 => 'paid', 5 => 'overdue'];
                    $status = $statusMap[$inv['invoice_status_id']] ?? 'draft';
                    
                    $invoice = Invoice::create([
                        'customer_id' => $mapping[$inv['client_id']],
                        'invoice_number' => $inv['invoice_number'],
                        'issue_date' => $inv['invoice_date_created'] ?? date('Y-m-d'),
                        'due_date' => $inv['invoice_date_due'] ?? date('Y-m-d', strtotime('+30 days')),
                        'status' => $status,
                        'subtotal' => $inv['invoice_item_subtotal'] ?? 0,
                        'tax_rate' => $inv['invoice_tax_rate_percent'] ?? 0,
                        'tax_amount' => $inv['invoice_item_tax_total'] ?? 0,
                        'total' => $inv['invoice_total'] ?? 0,
                        'paid_amount' => $inv['invoice_paid'] ?? 0,
                        'notes' => $inv['invoice_terms'] ?? null,
                    ]);
                    
                    // Import invoice items
                    $items = $parsedData['invoice_items'][$inv['invoice_id']] ?? [];
                    foreach ($items as $item) {
                        // Debug: Log first item's data
                        if ($imported === 0) {
                            error_log('DEBUG: First invoice item data: ' . json_encode($item));
                        }
                        
                        // Determine item type from InvoicePlane unit
                        $unitName = strtolower($item['item_product_unit'] ?? '');
                        if (in_array($unitName, ['part', 'parts', 'item', 'items'])) {
                            $itemType = 'part';
                        } elseif (in_array($unitName, ['hour', 'hours', 'day', 'days'])) {
                            $itemType = 'service';
                        } else {
                            // Fallback: check item name
                            $itemName = strtolower($item['item_name'] ?? '');
                            $itemType = (strpos($itemName, 'service') !== false || 
                                        strpos($itemName, 'captain') !== false ||
                                        strpos($itemName, 'labor') !== false) ? 'service' : 'part';
                        }
                        
                        $invoice->items()->create([
                            'item_type' => $itemType,
                            'part_id' => null,
                            'service_id' => null,
                            'description' => $item['item_name'] ?? 'Imported Item',
                            'quantity' => $item['item_quantity'] ?? 1,
                            'unit_price' => $item['item_price'] ?? 0,
                            'total' => $item['item_subtotal'] ?? 0,
                        ]);
                    }
                    
                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Invoice {$inv['invoice_number']}: " . $e->getMessage();
                }
            }
            
            $results['invoices'] = ['imported' => $imported, 'errors' => count($errors), 'error_details' => $errors];
        }
        
        // Import Quotes
        if (in_array('quotes', $importTypes)) {
            $mapping = $_SESSION['customer_mapping'] ?? [];
            
            // If no mapping in session, rebuild from existing customers
            if (empty($mapping)) {
                $existingCustomers = Customer::all();
                foreach ($parsedData['customers'] ?? [] as $client) {
                    $email = $client['client_email'] ?: 'noemail_' . $client['client_id'] . '@imported.local';
                    $existing = $existingCustomers->firstWhere('email', $email);
                    if ($existing) {
                        $mapping[$client['client_id']] = $existing->id;
                    }
                }
                $_SESSION['customer_mapping'] = $mapping;
            }
            
            if (empty($mapping) && !empty($parsedData['quotes'])) {
                throw new Exception('No customer mapping found. Please check the "Customers" box to rebuild mapping (duplicates will be skipped).');
            }
            
            $imported = 0;
            $errors = [];
            
            foreach ($parsedData['quotes'] as $qt) {
                try {
                    if (!isset($mapping[$qt['client_id']])) {
                        $errors[] = "Quote {$qt['quote_number']}: Customer not found (client_id: {$qt['client_id']})";
                        continue;
                    }
                    
                    // Map status
                    $statusMap = [1 => 'draft', 2 => 'sent', 3 => 'sent', 4 => 'approved', 5 => 'rejected'];
                    $status = $statusMap[$qt['quote_status_id']] ?? 'draft';
                    
                    $quote = Quote::create([
                        'customer_id' => $mapping[$qt['client_id']],
                        'quote_number' => $qt['quote_number'],
                        'issue_date' => $qt['quote_date_created'] ?? date('Y-m-d'),
                        'expiration_date' => $qt['quote_date_expires'] ?? date('Y-m-d', strtotime('+30 days')),
                        'status' => $status,
                        'subtotal' => $qt['quote_item_subtotal'] ?? 0,
                        'tax_rate' => $qt['quote_tax_rate_percent'] ?? 0,
                        'tax_amount' => $qt['quote_item_tax_total'] ?? 0,
                        'total' => $qt['quote_total'] ?? 0,
                        'notes' => $qt['quote_terms'] ?? null,
                    ]);
                    
                    // Import quote items
                    $items = $parsedData['quote_items'][$qt['quote_id']] ?? [];
                    foreach ($items as $item) {
                        // Determine item type from InvoicePlane unit
                        $unitName = strtolower($item['item_product_unit'] ?? '');
                        if (in_array($unitName, ['part', 'parts', 'item', 'items'])) {
                            $itemType = 'part';
                        } elseif (in_array($unitName, ['hour', 'hours', 'day', 'days'])) {
                            $itemType = 'service';
                        } else {
                            // Fallback: check item name
                            $itemName = strtolower($item['item_name'] ?? '');
                            $itemType = (strpos($itemName, 'service') !== false || 
                                        strpos($itemName, 'captain') !== false ||
                                        strpos($itemName, 'labor') !== false) ? 'service' : 'part';
                        }
                        
                        $quote->items()->create([
                            'item_type' => $itemType,
                            'part_id' => null,
                            'service_id' => null,
                            'description' => $item['item_name'] ?? 'Imported Item',
                            'quantity' => $item['item_quantity'] ?? 1,
                            'unit_price' => $item['item_price'] ?? 0,
                            'total' => $item['item_subtotal'] ?? 0,
                        ]);
                    }
                    
                    $imported++;
                } catch (Exception $e) {
                    $errors[] = "Quote {$qt['quote_number']}: " . $e->getMessage();
                }
            }
            
            $results['quotes'] = ['imported' => $imported, 'errors' => count($errors), 'error_details' => $errors];
        }
        
        // Import Products/Services
        if (in_array('products', $importTypes)) {
            $products = $parsedData['products'] ?? [];
            
            $partsImported = 0;
            $servicesImported = 0;
            $errors = [];
            
            foreach ($products as $product) {
                try {
                    $name = $product['product_name'] ?? 'Imported Product';
                    $description = $product['product_description'] ?? null;
                    $price = isset($product['product_price']) ? (float)$product['product_price'] : 0;
                    $sku = $product['product_sku'] ?? null;
                    $familyId = $product['family_id'] ?? null;
                    $unitId = $product['unit_id'] ?? null;
                    
                    // Determine if it's a part or service based on InvoicePlane data
                    // family_id: 1=Marine Parts, 2=Marine Labor, 3=Shipping, 4=Crew Services, 5=Supplies
                    // unit_id: 1=Hours, 2=Parts, 3=Items, 4=Days, 5=Occurrence, 6=Shipment
                    
                    $isService = false;
                    
                    // Check family_id first (most reliable)
                    if ($familyId == 2 || $familyId == 4) {
                        // Marine Labor or Crew Services = Service
                        $isService = true;
                    } elseif ($familyId == 1 || $familyId == 5) {
                        // Marine Parts or Supplies = Part
                        $isService = false;
                    } elseif ($unitId == 1 || $unitId == 4) {
                        // Hours or Days = Service
                        $isService = true;
                    } elseif ($unitId == 2) {
                        // Parts = Part
                        $isService = false;
                    } else {
                        // Fallback: check name patterns
                        $nameLower = strtolower($name);
                        $servicePatterns = ['service', 'captain', 'mate', 'steward', 'labor', 'crew', 'engineer'];
                        foreach ($servicePatterns as $pattern) {
                            if (strpos($nameLower, $pattern) !== false) {
                                $isService = true;
                                break;
                            }
                        }
                    }
                    
                    if ($isService) {
                        // Import as Service
                        // Map family_id to category name
                        $categoryMap = [
                            1 => 'Marine Parts',
                            2 => 'Marine Labor', 
                            3 => 'Shipping',
                            4 => 'Crew Services',
                            5 => 'Shipboard Supplies'
                        ];
                        $category = $categoryMap[$familyId] ?? null;
                        
                        Service::create([
                            'name' => $name,
                            'description' => $description,
                            'category' => $category,
                            'hourly_rate' => $price,
                            'duration_minutes' => null,
                            'active' => true,
                        ]);
                        $servicesImported++;
                    } else {
                        // Import as Part
                        // Use SKU if available, otherwise generate one
                        $partSku = $sku ?: 'IP-' . str_pad($product['product_id'] ?? uniqid(), 6, '0', STR_PAD_LEFT);
                        
                        // Get purchase price if available
                        $cost = isset($product['purchase_price']) && $product['purchase_price'] > 0 
                                ? (float)$product['purchase_price'] 
                                : 0;
                        
                        Part::create([
                            'sku' => $partSku,
                            'name' => $name,
                            'description' => $description,
                            'cost' => $cost,
                            'price' => $price,
                            'stock_quantity' => 0,
                            'min_stock_level' => 0,
                            'location' => $product['provider_name'] ?? null,
                            'vendor_part_numbers' => $sku ? json_encode(['original_sku' => $sku]) : null,
                        ]);
                        $partsImported++;
                    }
                    
                } catch (Exception $e) {
                    $errors[] = "Product {$name}: " . $e->getMessage();
                }
            }
            
            $results['products'] = [
                'imported' => ($partsImported + $servicesImported), 
                'parts' => $partsImported,
                'services' => $servicesImported,
                'errors' => count($errors), 
                'error_details' => $errors
            ];
        }
        
        $message = 'Migration completed successfully!';
        $step = 'complete';
        $_SESSION['results'] = $results;
        
    } catch (Exception $e) {
        $error = $e->getMessage();
    }
}

// Load preview data if on preview step
if ($step === 'preview' && !isset($preview)) {
    $preview = $_SESSION['preview'] ?? null;
    if (!$preview) {
        $error = 'Session expired. Please upload the SQL file again.';
        $step = 'upload';
    }
}

// Cleanup function
if (isset($_GET['cleanup'])) {
    session_destroy();
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
    <title>InvoicePlane Migration Tool</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 900px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; margin-top: 0; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            color: #856404;
        }
        .error {
            background: #f8d7da;
            border-left: 4px solid #dc3545;
            padding: 15px;
            margin: 20px 0;
            color: #721c24;
        }
        .success {
            background: #d4edda;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 20px 0;
            color: #155724;
        }
        .info {
            background: #d1ecf1;
            border-left: 4px solid #17a2b8;
            padding: 15px;
            margin: 20px 0;
            color: #0c5460;
        }
        .btn {
            background: #3498db;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            display: inline-block;
            margin: 5px;
        }
        .btn:hover { background: #2980b9; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .preview-box {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
        .checkbox-group {
            margin: 20px 0;
        }
        .checkbox-group label {
            display: block;
            padding: 15px;
            margin: 8px 0;
            background: #f8f9fa;
            border-radius: 4px;
            cursor: pointer;
            border: 2px solid #dee2e6;
            transition: all 0.2s;
        }
        .checkbox-group label:hover {
            border-color: #3498db;
            background: #e3f2fd;
        }
        .checkbox-group input {
            margin-right: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .step-indicator {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            padding: 0;
            list-style: none;
        }
        .step-indicator li {
            flex: 1;
            text-align: center;
            padding: 15px;
            background: #e9ecef;
            margin: 0 5px;
            border-radius: 4px;
            font-weight: 500;
        }
        .step-indicator li.active {
            background: #3498db;
            color: white;
            font-weight: bold;
        }
        .step-indicator li.complete {
            background: #28a745;
            color: white;
        }
        pre {
            background: #f4f4f4;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 13px;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: #3498db;
            transition: width 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚢 InvoicePlane Migration Tool</h1>

        <div class="warning">
            <strong>⚠️ SECURITY WARNING:</strong> Delete this file immediately after migration!<br>
            <code>rm <?= __FILE__ ?></code>
        </div>

        <ul class="step-indicator">
            <li class="<?= $step === 'upload' ? 'active' : 'complete' ?>">1. Upload SQL</li>
            <li class="<?= $step === 'preview' ? 'active' : ($step === 'migrate' || $step === 'complete' ? 'complete' : '') ?>">2. Preview</li>
            <li class="<?= $step === 'complete' ? 'active' : '' ?>">3. Complete</li>
        </ul>

        <?php if ($error): ?>
            <div class="error">
                <strong>❌ Error:</strong> <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <?php if ($message): ?>
            <div class="success">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <?php if ($step === 'upload'): ?>
            <h2>Step 1: Upload InvoicePlane SQL Dump</h2>
            
            <div class="info">
                <h3>📁 How to get your SQL dump:</h3>
                
                <p><strong>Option 1 - phpMyAdmin:</strong></p>
                <ol>
                    <li>Login to phpMyAdmin</li>
                    <li>Select your InvoicePlane database</li>
                    <li>Click "Export" tab</li>
                    <li>Choose "Quick" export</li>
                    <li>Format: SQL</li>
                    <li>Click "Go" to download</li>
                </ol>
                
                <p><strong>Option 2 - Command Line:</strong></p>
                <pre>mysqldump -u username -p database_name > invoiceplane.sql</pre>
                
                <p><strong>Option 3 - Plesk File Manager:</strong></p>
                <ol>
                    <li>Go to Plesk → Databases</li>
                    <li>Click "Export Dump" for InvoicePlane database</li>
                    <li>Download the .sql file</li>
                </ol>
            </div>

            <form method="POST" enctype="multipart/form-data">
                <input type="hidden" name="step" value="upload">
                <div style="margin: 30px 0;">
                    <label for="sql_dump" style="display: block; margin-bottom: 10px; font-weight: 600; font-size: 16px;">
                        📄 Select InvoicePlane SQL Dump File:
                    </label>
                    <input type="file" name="sql_dump" id="sql_dump" accept=".sql" required 
                           style="padding: 10px; font-size: 14px; width: 100%; max-width: 500px;">
                    <p style="margin-top: 10px; color: #666; font-size: 14px;">
                        ⏱️ Large files may take a minute to process
                    </p>
                </div>
                <button type="submit" class="btn btn-success">📤 Upload and Analyze</button>
            </form>

        <?php elseif ($step === 'preview'): ?>
            <?php $preview = $_SESSION['preview'] ?? null; ?>
            <?php if (!$preview): ?>
                <div class="error">
                    Session expired. Please upload the SQL file again.
                </div>
                <?php $step = 'upload'; ?>
            <?php else: ?>
            <h2>Step 2: Preview and Select Data to Import</h2>
            
            <div class="preview-box">
                <h3>📊 Data Found in SQL Dump</h3>
                <table>
                    <tr>
                        <th>Type</th>
                        <th>Count</th>
                        <th>Status</th>
                    </tr>
                    <tr>
                        <td><strong>👥 Customers</strong></td>
                        <td><?= $preview['customer_count'] ?></td>
                        <td><span style="color: #28a745;">✓ Ready</span></td>
                    </tr>
                    <tr>
                        <td><strong>📄 Invoices</strong></td>
                        <td><?= $preview['invoice_count'] ?></td>
                        <td><span style="color: #28a745;">✓ Ready</span></td>
                    </tr>
                    <tr>
                        <td><strong>📋 Quotes</strong></td>
                        <td><?= $preview['quote_count'] ?></td>
                        <td><span style="color: #28a745;">✓ Ready</span></td>
                    </tr>
                    <tr>
                        <td><strong>📦 Products/Services</strong></td>
                        <td><?= $preview['product_count'] ?? 0 ?></td>
                        <td><span style="color: #28a745;">✓ Ready</span></td>
                    </tr>
                </table>
            </div>

            <?php if (!empty($preview['sample_customers'])): ?>
                <div class="preview-box">
                    <h3>Sample Customers (first 5)</h3>
                    <table>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                        </tr>
                        <?php foreach ($preview['sample_customers'] as $customer): ?>
                            <tr>
                                <td><?= htmlspecialchars($customer['client_name'] ?? $customer['name'] ?? 'N/A') ?></td>
                                <td><?= htmlspecialchars($customer['client_email'] ?? $customer['email'] ?? 'No email') ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            <?php endif; ?>

            <?php if (!empty($preview['sample_invoices'])): ?>
                <div class="preview-box">
                    <h3>Sample Invoices (first 5)</h3>
                    <table>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date</th>
                            <th>Total</th>
                        </tr>
                        <?php foreach ($preview['sample_invoices'] as $invoice): ?>
                            <tr>
                                <td><?= htmlspecialchars($invoice['invoice_number'] ?? $invoice['invoice_number_old'] ?? 'N/A') ?></td>
                                <td><?= htmlspecialchars($invoice['invoice_date_created'] ?? $invoice['invoice_date'] ?? 'N/A') ?></td>
                                <td>$<?= isset($invoice['invoice_total']) ? number_format((float)$invoice['invoice_total'], 2) : '0.00' ?></td>
                            </tr>
                        <?php endforeach; ?>
                    </table>
                </div>
            <?php endif; ?>

            <form method="POST">
                <input type="hidden" name="step" value="migrate">
                
                <h3>✅ Select What to Import:</h3>
                <div class="checkbox-group">
                    <label>
                        <input type="checkbox" name="import_types[]" value="customers" checked>
                        <strong>👥 Customers</strong> (<?= $preview['customer_count'] ?> records)
                        <small style="display: block; color: #666; margin-left: 25px;">
                            ⚠️ Required! Must be imported for invoices and quotes to work
                        </small>
                    </label>
                    
                    <label>
                        <input type="checkbox" name="import_types[]" value="invoices" checked>
                        <strong>📄 Invoices</strong> (<?= $preview['invoice_count'] ?> records with line items)
                        <small style="display: block; color: #666; margin-left: 25px;">
                            Includes all invoice items and preserves invoice numbers
                        </small>
                    </label>
                    
                    <label>
                        <input type="checkbox" name="import_types[]" value="quotes" checked>
                        <strong>📋 Quotes</strong> (<?= $preview['quote_count'] ?> records with line items)
                        <small style="display: block; color: #666; margin-left: 25px;">
                            Includes all quote items and preserves quote numbers
                        </small>
                    </label>
                    
                    <label>
                        <input type="checkbox" name="import_types[]" value="products" checked>
                        <strong>📦 Products/Services</strong> (<?= $preview['product_count'] ?? 0 ?> records)
                        <small style="display: block; color: #666; margin-left: 25px;">
                            Imports as Parts (physical items with SKU) and Services (labor/work)
                        </small>
                    </label>
                </div>

                <div class="info">
                    <strong>ℹ️ Import Notes:</strong>
                    <ul style="margin: 10px 0;">
                        <li>Customers with duplicate emails will be skipped (not imported twice)</li>
                        <li>All line items are imported as 'service' type</li>
                        <li>Invoice/quote statuses are automatically mapped</li>
                        <li>This process cannot be undone - make sure you have a backup!</li>
                    </ul>
                </div>

                <div style="margin-top: 30px;">
                    <button type="submit" class="btn btn-success">🚀 Start Migration</button>
                    <a href="?cleanup=1" class="btn btn-danger">❌ Cancel</a>
                </div>
            </form>
            <?php endif; ?>

        <?php elseif ($step === 'complete'): ?>
            <h2>✅ Migration Complete!</h2>
            
            <div class="success">
                <h3>🎉 Your InvoicePlane data has been imported!</h3>
            </div>

            <?php if (isset($_SESSION['results'])): ?>
                <?php foreach ($_SESSION['results'] as $type => $result): ?>
                    <div class="preview-box">
                        <h3><?= ucfirst($type) ?></h3>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: <?= $result['errors'] > 0 ? '100%' : '100%' ?>">
                                <?= $result['imported'] ?> imported
                            </div>
                        </div>
                        <p>
                            ✅ <strong>Successfully Imported:</strong> <?= $result['imported'] ?><br>
                            <?php if ($type === 'products' && isset($result['parts'], $result['services'])): ?>
                                &nbsp;&nbsp;&nbsp;├─ Parts: <?= $result['parts'] ?><br>
                                &nbsp;&nbsp;&nbsp;└─ Services: <?= $result['services'] ?><br>
                            <?php endif; ?>
                            <?php if (isset($result['skipped']) && $result['skipped'] > 0): ?>
                                ⏭️ <strong>Skipped (duplicates):</strong> <?= $result['skipped'] ?><br>
                            <?php endif; ?>
                            <?php if ($result['errors'] > 0): ?>
                                ⚠️ <strong>Errors:</strong> <?= $result['errors'] ?><br>
                                <?php if (!empty($result['error_details'])): ?>
                                    <details style="margin-top: 10px;">
                                        <summary style="cursor: pointer; color: #dc3545; font-weight: 600;">
                                            Click to view error details
                                        </summary>
                                        <ul style="margin: 10px 0; max-height: 200px; overflow-y: auto;">
                                            <?php foreach (array_slice($result['error_details'], 0, 20) as $err): ?>
                                                <li style="margin: 5px 0; font-size: 13px;"><?= htmlspecialchars($err) ?></li>
                                            <?php endforeach; ?>
                                            <?php if (count($result['error_details']) > 20): ?>
                                                <li><em>... and <?= count($result['error_details']) - 20 ?> more errors</em></li>
                                            <?php endif; ?>
                                        </ul>
                                    </details>
                                <?php endif; ?>
                            <?php endif; ?>
                        </p>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>

            <div class="warning" style="margin-top: 40px;">
                <h3>🔒 IMPORTANT - SECURITY</h3>
                <p style="font-size: 16px; margin: 10px 0;">
                    <strong>Delete this migration tool immediately:</strong>
                </p>
                <pre>rm <?= __FILE__ ?></pre>
                <p style="margin-top: 15px;">
                    <a href="?cleanup=1" class="btn btn-danger">🗑️ Cleanup Session & Exit</a>
                </p>
            </div>

            <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 5px;">
                <h3>🎯 What's Next?</h3>
                <p>Your data is now in the CRM. Visit these pages to verify:</p>
                <div style="margin-top: 15px;">
                    <a href="https://crm.captainellenbogen.com/frontend/customers" class="btn">👥 View Customers</a>
                    <a href="https://crm.captainellenbogen.com/frontend/invoices" class="btn">📄 View Invoices</a>
                    <a href="https://crm.captainellenbogen.com/frontend/quotes" class="btn">📋 View Quotes</a>
                </div>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

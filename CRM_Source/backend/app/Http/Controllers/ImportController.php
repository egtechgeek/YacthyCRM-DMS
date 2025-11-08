<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Part;
use App\Models\Service;
use Illuminate\Support\Facades\Validator;

class ImportController extends Controller
{
    /**
     * Import CSV data
     */
    public function importCSV(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'csv_file' => ['required', 'file', 'mimes:csv,txt'],
            'import_type' => ['required', 'in:customers,parts,services'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('csv_file');
        $importType = $request->input('import_type');

        try {
            $data = $this->parseCSV($file);
            
            $imported = 0;
            $errors = [];

            switch ($importType) {
                case 'customers':
                    $result = $this->importCustomers($data);
                    break;
                case 'parts':
                    $result = $this->importParts($data);
                    break;
                case 'services':
                    $result = $this->importServices($data);
                    break;
                default:
                    return response()->json(['message' => 'Invalid import type'], 422);
            }

            return response()->json([
                'message' => 'Import completed',
                'imported' => $result['imported'],
                'errors' => $result['errors'],
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Import failed: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Parse CSV file
     */
    private function parseCSV($file)
    {
        $data = [];
        $handle = fopen($file->getPathname(), 'r');
        
        $headers = fgetcsv($handle);
        
        while (($row = fgetcsv($handle)) !== false) {
            $data[] = array_combine($headers, $row);
        }
        
        fclose($handle);
        
        return $data;
    }

    /**
     * Import customers from CSV
     */
    private function importCustomers($data)
    {
        $imported = 0;
        $errors = [];

        foreach ($data as $row) {
            try {
                $customerData = [
                    'name' => $row['name'] ?? null,
                    'email' => $row['email'] ?? null,
                    'phone' => $row['phone'] ?? null,
                    'address' => $row['address'] ?? null,
                    'city' => $row['city'] ?? null,
                    'state' => $row['state'] ?? null,
                    'zip' => $row['zip'] ?? null,
                    'country' => $row['country'] ?? null,
                    'notes' => $row['notes'] ?? null,
                ];

                // Skip if customer with same email already exists
                if (Customer::where('email', $customerData['email'])->exists()) {
                    continue;
                }

                Customer::create($customerData);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row error: " . $e->getMessage();
            }
        }

        return ['imported' => $imported, 'errors' => $errors];
    }

    /**
     * Import parts from CSV
     */
    private function importParts($data)
    {
        $imported = 0;
        $errors = [];

        foreach ($data as $row) {
            try {
                $partData = [
                    'sku' => $row['sku'] ?? null,
                    'name' => $row['name'] ?? null,
                    'description' => $row['description'] ?? null,
                    'category' => $row['category'] ?? null,
                    'price' => isset($row['unit_price']) ? floatval($row['unit_price']) : 0,
                    'cost' => isset($row['cost']) ? floatval($row['cost']) : 0,
                    'stock_quantity' => isset($row['stock_quantity']) ? intval($row['stock_quantity']) : 0,
                    'location' => $row['location'] ?? null,
                    'active' => true,
                ];

                // Skip if part with same SKU already exists
                if (Part::where('sku', $partData['sku'])->exists()) {
                    continue;
                }

                Part::create($partData);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row error: " . $e->getMessage();
            }
        }

        return ['imported' => $imported, 'errors' => $errors];
    }

    /**
     * Import services from CSV
     */
    private function importServices($data)
    {
        $imported = 0;
        $errors = [];

        foreach ($data as $row) {
            try {
                $serviceData = [
                    'name' => $row['name'] ?? null,
                    'description' => $row['description'] ?? null,
                    'category' => $row['category'] ?? null,
                    'hourly_rate' => isset($row['hourly_rate']) ? floatval($row['hourly_rate']) : 0,
                    'billable' => isset($row['billable']) ? filter_var($row['billable'], FILTER_VALIDATE_BOOLEAN) : true,
                ];

                // Skip if service with same name already exists
                if (Service::where('name', $serviceData['name'])->exists()) {
                    continue;
                }

                Service::create($serviceData);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row error: " . $e->getMessage();
            }
        }

        return ['imported' => $imported, 'errors' => $errors];
    }
}

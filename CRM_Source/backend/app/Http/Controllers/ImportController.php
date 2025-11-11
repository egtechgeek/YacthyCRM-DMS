<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Part;
use App\Models\Service;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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
     * Import JSON data (partial or complete backup)
     */
    public function importJSON(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $validator = Validator::make($request->all(), [
            'json_file' => ['required', 'file', 'mimes:json,txt'],
            'import_type' => ['nullable', 'in:customers,parts,services,complete'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $file = $request->file('json_file');
        $importType = $request->input('import_type');

        $payload = json_decode(file_get_contents($file->getPathname()), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'message' => 'Invalid JSON file: ' . json_last_error_msg(),
            ], 422);
        }

        if (!$importType) {
            $importType = $this->detectJsonImportType($payload);
            if (!$importType) {
                return response()->json([
                    'message' => 'Unable to determine import type. Please select an import type.',
                ], 422);
            }
        }

        try {
            switch ($importType) {
                case 'customers':
                    $data = $this->normalizeJsonArray($payload);
                    $result = $this->importCustomers($data);
                    break;
                case 'parts':
                    $data = $this->normalizeJsonArray($payload);
                    $result = $this->importParts($data);
                    break;
                case 'services':
                    $data = $this->normalizeJsonArray($payload);
                    $result = $this->importServices($data);
                    break;
                case 'complete':
                    $result = $this->importCompleteBackup($payload);
                    break;
                default:
                    return response()->json(['message' => 'Invalid import type'], 422);
            }

            return response()->json([
                'message' => 'Import completed',
                'imported' => $result['imported'] ?? null,
                'errors' => $result['errors'] ?? [],
                'counts' => $result['counts'] ?? null,
                'details' => $result['details'] ?? null,
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

    /**
     * Detect import type based on JSON payload
     */
    private function detectJsonImportType($payload): ?string
    {
        if (!is_array($payload)) {
            return null;
        }

        $isAssoc = array_keys($payload) !== range(0, count($payload) - 1);

        if ($isAssoc) {
            $knownTables = $this->getCompleteBackupTables();
            $matches = array_intersect(array_keys($payload), $knownTables);
            if (!empty($matches)) {
                return 'complete';
            }
        }

        return null;
    }

    /**
     * Normalize JSON payload to an array of rows
     */
    private function normalizeJsonArray($payload): array
    {
        if (is_array($payload)) {
            $isAssoc = array_keys($payload) !== range(0, count($payload) - 1);
            if ($isAssoc) {
                return [$payload];
            }
            return $payload;
        }

        return [];
    }

    /**
     * Import complete backup JSON (multiple tables)
     */
    private function importCompleteBackup(array $payload): array
    {
        $tables = $this->getCompleteBackupTables();
        $processed = [];

        DB::beginTransaction();
        Schema::disableForeignKeyConstraints();

        try {
            foreach ($tables as $table) {
                if (!array_key_exists($table, $payload) || !is_array($payload[$table])) {
                    continue;
                }

                $rows = $this->normalizeJsonArray($payload[$table]);
                $rows = array_map(function ($row) {
                    return is_array($row) ? $row : (array) $row;
                }, $rows);

                if (empty($rows)) {
                    $processed[$table] = 0;
                    continue;
                }

                $hasId = array_key_exists('id', $rows[0]);

                foreach (array_chunk($rows, 500) as $chunk) {
                    if ($hasId) {
                        DB::table($table)->upsert($chunk, ['id']);
                    } else {
                        DB::table($table)->insert($chunk);
                    }
                }

                $processed[$table] = count($rows);
            }

            Schema::enableForeignKeyConstraints();
            DB::commit();

            return [
                'counts' => $processed,
            ];
        } catch (\Exception $exception) {
            Schema::enableForeignKeyConstraints();
            DB::rollBack();
            throw $exception;
        }
    }

    /**
     * Tables included in complete backup/restore
     */
    private function getCompleteBackupTables(): array
    {
        return [
            'users',
            'customers',
            'yachts',
            'vehicles',
            'quotes',
            'quote_items',
            'invoices',
            'invoice_items',
            'payments',
            'parts',
            'services',
            'appointments',
            'settings',
            'modules',
            'navigation_order',
            'role_permissions',
            'time_entries',
            'time_off_requests',
            'maintenance_schedules',
            'maintenance_history',
        ];
    }
}

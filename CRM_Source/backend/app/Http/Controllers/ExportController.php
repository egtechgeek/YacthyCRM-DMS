<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Yacht;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Payment;
use App\Models\Part;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\Vehicle;

class ExportController extends Controller
{
    /**
     * Export data
     */
    public function export(Request $request)
    {
        $user = $request->user();

        if (!$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized - Admin access required'], 403);
        }

        $type = $request->input('type', 'customers');
        $format = $request->input('format', 'csv');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');

        $data = $this->getExportData($type, $dateFrom, $dateTo);

        if ($format === 'json') {
            return response()->json($data);
        } else {
            return $this->exportCSV($data, $type);
        }
    }

    /**
     * Get data for export
     */
    private function getExportData($type, $dateFrom = null, $dateTo = null)
    {
        $query = null;

        switch ($type) {
            case 'customers':
                $query = Customer::query();
                break;
            case 'yachts':
                $query = Yacht::with('customer');
                break;
            case 'vehicles':
                $query = Vehicle::with('customer');
                break;
            case 'invoices':
                $query = Invoice::with(['customer', 'yacht', 'items']);
                break;
            case 'quotes':
                $query = Quote::with(['customer', 'yacht', 'items']);
                break;
            case 'payments':
                $query = Payment::with('invoice');
                break;
            case 'parts':
                $query = Part::query();
                break;
            case 'services':
                $query = Service::query();
                break;
            case 'appointments':
                $query = Appointment::with(['customer', 'yacht', 'vehicle', 'staff']);
                break;
            default:
                return [];
        }

        if ($dateFrom) {
            $query->where('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->where('created_at', '<=', $dateTo . ' 23:59:59');
        }

        return $query->get()->toArray();
    }

    /**
     * Export as CSV
     */
    private function exportCSV($data, $type)
    {
        if (empty($data)) {
            return response('No data to export', 404);
        }

        $filename = "{$type}_export_" . date('Y-m-d') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($data) {
            $file = fopen('php://output', 'w');

            // Get headers from first row
            if (!empty($data)) {
                $headers = $this->flattenArray(array_keys($data[0]));
                fputcsv($file, $headers);

                foreach ($data as $row) {
                    fputcsv($file, $this->flattenArray(array_values($row)));
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Flatten nested arrays for CSV export
     */
    private function flattenArray($array)
    {
        $result = [];
        foreach ($array as $value) {
            if (is_array($value)) {
                $result[] = json_encode($value);
            } else {
                $result[] = $value;
            }
        }
        return $result;
    }
}

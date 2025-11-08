<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Yacht;
use App\Models\Vehicle;
use App\Models\Invoice;
use App\Models\Quote;
use App\Models\Module;
use App\Models\WorkOrder;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics
     */
    public function stats(Request $request)
    {
        $user = $request->user();

        // Check which modules are enabled
        $yachtModuleEnabled = Module::where('key', 'yacht')->where('enabled', true)->exists();
        $dmsModuleEnabled = Module::where('key', 'dms')->where('enabled', true)->exists();

        // Total customers
        $customers = Customer::count();

        // Total vehicles/yachts based on enabled module
        $vehicleCount = 0;
        if ($dmsModuleEnabled) {
            $vehicleCount = Vehicle::count();
        } elseif ($yachtModuleEnabled) {
            $vehicleCount = Yacht::count();
        }

        // Active invoices (not paid, not cancelled, not write-off)
        $activeInvoices = Invoice::whereNotIn('status', ['paid', 'cancelled', 'write-off'])->count();

        // Overdue invoices (excluding write-offs)
        $overdueInvoices = Invoice::where('status', 'overdue')->count();

        // Total revenue for current year
        $currentYear = Carbon::now()->year;
        $totalRevenue = Invoice::where('status', 'paid')
            ->whereYear('issue_date', $currentYear)
            ->sum('total');

        // Pending quotes (draft or sent)
        $pendingQuotes = Quote::whereIn('status', ['draft', 'sent'])->count();

        // Work orders
        $openWorkOrders = WorkOrder::where('status', 'open')->count();
        $inProgressWorkOrders = WorkOrder::where('status', 'in_progress')->count();

        return response()->json([
            'customers' => $customers,
            'vehicles' => $vehicleCount, // Use 'vehicles' for both vehicles and yachts
            'yachts' => $vehicleCount, // Keep for backwards compatibility
            'active_invoices' => $activeInvoices,
            'overdue_invoices' => $overdueInvoices,
            'total_revenue' => round($totalRevenue, 2),
            'pending_quotes' => $pendingQuotes,
            'open_work_orders' => $openWorkOrders,
            'in_progress_work_orders' => $inProgressWorkOrders,
        ], 200);
    }
}


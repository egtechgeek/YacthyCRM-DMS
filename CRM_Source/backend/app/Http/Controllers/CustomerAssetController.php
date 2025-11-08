<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Module;
use App\Models\Yacht;
use App\Models\Vehicle;

class CustomerAssetController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $customerId = $request->input('customer_id');

        if (!$customerId && $user->isCustomer()) {
            $customer = $user->customer;
            if ($customer) {
                $customerId = $customer->id;
            }
        }

        if (!$customerId) {
            return response()->json(['data' => []], 200);
        }

        $yachtEnabled = Module::isEnabled('yacht');
        $dmsEnabled = Module::isEnabled('dms');

        $assets = [];

        if ($yachtEnabled) {
            $yachts = Yacht::where('customer_id', $customerId)->get();
            foreach ($yachts as $yacht) {
                $assets[] = [
                    'id' => $yacht->id,
                    'asset_type' => 'yacht',
                    'name' => $yacht->name,
                    'display_name' => trim($yacht->year . ' ' . $yacht->model) ?: $yacht->name,
                    'identifier' => $yacht->hull_identification_number,
                    'link' => '/yachts/' . $yacht->id,
                ];
            }
        }

        if ($dmsEnabled) {
            $vehicles = Vehicle::where('customer_id', $customerId)->get();
            foreach ($vehicles as $vehicle) {
                $displayName = implode(' ', array_filter([$vehicle->year, $vehicle->make, $vehicle->model]));
                $assets[] = [
                    'id' => $vehicle->id,
                    'asset_type' => 'vehicle',
                    'name' => $vehicle->name ?? $displayName,
                    'display_name' => $displayName ?: $vehicle->name,
                    'identifier' => $vehicle->vin,
                    'link' => '/vehicles/' . $vehicle->id,
                ];
            }
        }

        return response()->json(['data' => $assets], 200);
    }
}

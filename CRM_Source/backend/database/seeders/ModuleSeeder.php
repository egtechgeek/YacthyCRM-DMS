<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Module;

class ModuleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $modules = [
            [
                'key' => 'yacht',
                'name' => 'Yacht Management',
                'description' => 'Manage yachts, maintenance records, and yacht-specific services',
                'enabled' => true,
                'display_order' => 1,
            ],
            [
                'key' => 'dms',
                'name' => 'Vehicle/RV DMS',
                'description' => 'Dealer Management System for vehicles and RVs',
                'enabled' => false,
                'display_order' => 2,
            ],
            [
                'key' => 'timeclock',
                'name' => 'Timeclock',
                'description' => 'Employee time tracking and reporting system',
                'enabled' => false,
                'display_order' => 3,
            ],
            [
                'key' => 'accounting',
                'name' => 'Accounting',
                'description' => 'Full accounting system with QuickBooks-style interface',
                'enabled' => false,
                'display_order' => 4,
            ],
        ];

        foreach ($modules as $module) {
            Module::updateOrCreate(
                ['key' => $module['key']],
                $module
            );
        }
    }
}

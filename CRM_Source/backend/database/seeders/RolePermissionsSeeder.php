<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RolePermission;

class RolePermissionsSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            // Core CRM Permissions
            ['role' => 'admin', 'resource' => 'users', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'users', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'users', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'users', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'customers', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'customers', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'customers', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'customers', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'invoices', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'invoices', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'invoices', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'invoices', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'quotes', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'quotes', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'quotes', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'quotes', 'action' => 'delete', 'granted' => true],
            
            // Yachts Module
            ['role' => 'admin', 'resource' => 'yachts', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'yachts', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'yachts', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'yachts', 'action' => 'delete', 'granted' => true],
            
            // Vehicle/RV DMS Module
            ['role' => 'admin', 'resource' => 'vehicles', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicles', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicles', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicles', 'action' => 'delete', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicle_service', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicle_service', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicle_service', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicle_documents', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'vehicle_documents', 'action' => 'upload', 'granted' => true],
            // Work Orders Module
            ['role' => 'admin', 'resource' => 'work_orders', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'work_orders', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'work_orders', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'work_orders', 'action' => 'delete', 'granted' => true],
            ['role' => 'admin', 'resource' => 'work_order_display', 'action' => 'view', 'granted' => true],
            
            // Timeclock Module
            ['role' => 'admin', 'resource' => 'timeclock', 'action' => 'view_all', 'granted' => true],
            ['role' => 'admin', 'resource' => 'timeclock', 'action' => 'clock_in_out', 'granted' => true],
            ['role' => 'admin', 'resource' => 'timeclock', 'action' => 'approve_entries', 'granted' => true],
            ['role' => 'admin', 'resource' => 'timeclock', 'action' => 'edit_entries', 'granted' => true],
            ['role' => 'admin', 'resource' => 'timeclock', 'action' => 'export', 'granted' => true],
            ['role' => 'admin', 'resource' => 'time_off', 'action' => 'view_all', 'granted' => true],
            ['role' => 'admin', 'resource' => 'time_off', 'action' => 'request', 'granted' => true],
            ['role' => 'admin', 'resource' => 'time_off', 'action' => 'approve', 'granted' => true],
            
            // Accounting Module
            ['role' => 'admin', 'resource' => 'accounting_chart_of_accounts', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_chart_of_accounts', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_chart_of_accounts', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_chart_of_accounts', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_journal_entries', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_journal_entries', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_journal_entries', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_journal_entries', 'action' => 'post', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_journal_entries', 'action' => 'void', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_vendors', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_vendors', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_vendors', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_vendors', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_bills', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bills', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bills', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bills', 'action' => 'delete', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bills', 'action' => 'pay', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_bank_accounts', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bank_accounts', 'action' => 'create', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bank_accounts', 'action' => 'edit', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_bank_accounts', 'action' => 'reconcile', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_reports', 'action' => 'view', 'granted' => true],
            ['role' => 'admin', 'resource' => 'accounting_reports', 'action' => 'export', 'granted' => true],
            
            ['role' => 'admin', 'resource' => 'accounting_import', 'action' => 'quickbooks', 'granted' => true],
            
            // Office Staff - Core CRM
            ['role' => 'office_staff', 'resource' => 'customers', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'customers', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'customers', 'action' => 'edit', 'granted' => true],
            
            ['role' => 'office_staff', 'resource' => 'invoices', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'invoices', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'invoices', 'action' => 'edit', 'granted' => true],
            
            ['role' => 'office_staff', 'resource' => 'quotes', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'quotes', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'quotes', 'action' => 'edit', 'granted' => true],
            
            // Office Staff - Yachts
            ['role' => 'office_staff', 'resource' => 'yachts', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'yachts', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'yachts', 'action' => 'edit', 'granted' => true],
            
            // Office Staff - Vehicles
            ['role' => 'office_staff', 'resource' => 'vehicles', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'vehicles', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'vehicles', 'action' => 'edit', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'vehicle_service', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'vehicle_service', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'vehicle_documents', 'action' => 'view', 'granted' => true],
            // Office Staff - Work Orders
            ['role' => 'office_staff', 'resource' => 'work_orders', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'work_orders', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'work_orders', 'action' => 'edit', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'work_order_display', 'action' => 'view', 'granted' => true],
            
            // Office Staff - Timeclock
            ['role' => 'office_staff', 'resource' => 'timeclock', 'action' => 'view_all', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'timeclock', 'action' => 'clock_in_out', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'timeclock', 'action' => 'approve_entries', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'time_off', 'action' => 'view_all', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'time_off', 'action' => 'request', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'time_off', 'action' => 'approve', 'granted' => true],
            
            // Office Staff - Accounting (Limited)
            ['role' => 'office_staff', 'resource' => 'accounting_chart_of_accounts', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'accounting_vendors', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'accounting_vendors', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'accounting_bills', 'action' => 'view', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'accounting_bills', 'action' => 'create', 'granted' => true],
            ['role' => 'office_staff', 'resource' => 'accounting_reports', 'action' => 'view', 'granted' => true],
            
            // Accountant - Full Accounting Access
            ['role' => 'accountant', 'resource' => 'customers', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'invoices', 'action' => 'view', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_chart_of_accounts', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_chart_of_accounts', 'action' => 'create', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_chart_of_accounts', 'action' => 'edit', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_chart_of_accounts', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_journal_entries', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_journal_entries', 'action' => 'create', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_journal_entries', 'action' => 'edit', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_journal_entries', 'action' => 'post', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_journal_entries', 'action' => 'void', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_vendors', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_vendors', 'action' => 'create', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_vendors', 'action' => 'edit', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_vendors', 'action' => 'delete', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_bills', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bills', 'action' => 'create', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bills', 'action' => 'edit', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bills', 'action' => 'delete', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bills', 'action' => 'pay', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_bank_accounts', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bank_accounts', 'action' => 'create', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bank_accounts', 'action' => 'edit', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_bank_accounts', 'action' => 'reconcile', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_reports', 'action' => 'view', 'granted' => true],
            ['role' => 'accountant', 'resource' => 'accounting_reports', 'action' => 'export', 'granted' => true],
            
            ['role' => 'accountant', 'resource' => 'accounting_import', 'action' => 'quickbooks', 'granted' => true],
            
            // Employee - Limited Access
            ['role' => 'employee', 'resource' => 'customers', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'invoices', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'yachts', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'vehicles', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'vehicle_service', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'work_orders', 'action' => 'view', 'granted' => true],
            ['role' => 'employee', 'resource' => 'work_orders', 'action' => 'edit', 'granted' => true],
            ['role' => 'employee', 'resource' => 'work_order_display', 'action' => 'view', 'granted' => true],
            
            // Employee - Timeclock
            ['role' => 'employee', 'resource' => 'timeclock', 'action' => 'clock_in_out', 'granted' => true],
            ['role' => 'employee', 'resource' => 'time_off', 'action' => 'request', 'granted' => true],
            
            // Customer - Self-service
            ['role' => 'customer', 'resource' => 'yachts', 'action' => 'view_own', 'granted' => true],
            ['role' => 'customer', 'resource' => 'vehicles', 'action' => 'view_own', 'granted' => true],
            ['role' => 'customer', 'resource' => 'invoices', 'action' => 'view_own', 'granted' => true],
            ['role' => 'customer', 'resource' => 'quotes', 'action' => 'view_own', 'granted' => true],
        ];

        foreach ($permissions as $permission) {
            RolePermission::updateOrCreate(
                [
                    'role' => $permission['role'],
                    'resource' => $permission['resource'],
                    'action' => $permission['action'],
                ],
                ['granted' => $permission['granted']]
            );
        }

        // Clear cache after seeding
        RolePermission::clearCache();
    }
}

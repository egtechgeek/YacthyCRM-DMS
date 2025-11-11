<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->string('role')->index();
            $table->string('resource'); // e.g., 'users', 'customers', 'invoices'
            $table->string('action'); // e.g., 'view', 'create', 'edit', 'delete'
            $table->boolean('granted')->default(true);
            $table->timestamps();
            
            // Unique constraint: one permission per role-resource-action combination
            $table->unique(['role', 'resource', 'action']);
        });

        // Seed default permissions
        $this->seedDefaultPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('role_permissions');
    }

    /**
     * Seed default permissions for all roles
     */
    private function seedDefaultPermissions()
    {
        $permissions = [
            // Admin - Full access
            'admin' => [
                'dashboard' => ['view'],
                'users' => ['view', 'create', 'edit', 'delete', 'manage_roles', 'disable_mfa', 'change_status'],
                'customers' => ['view', 'create', 'edit', 'delete'],
                'email_invites' => ['send'],
                'yachts' => ['view', 'create', 'edit', 'delete'],
                'invoices' => ['view', 'create', 'edit', 'delete', 'download_pdf'],
                'quotes' => ['view', 'create', 'edit', 'delete', 'download_pdf'],
                'payments' => ['view', 'create', 'edit', 'delete', 'virtual_terminal'],
                'parts' => ['view', 'create', 'edit', 'delete', 'manage_categories'],
                'services' => ['view', 'create', 'edit', 'delete'],
                'appointments' => ['view', 'create', 'edit', 'delete'],
                'maintenance' => ['view', 'create', 'edit', 'delete'],
                'email_templates' => ['view', 'edit'],
                'reports' => ['view', 'generate'],
                'data' => ['import', 'export'],
                'settings' => ['view', 'edit', 'manage_templates', 'manage_integrations', 'manage_roles'],
            ],
            // Office Staff - Operational access
            'office_staff' => [
                'dashboard' => ['view'],
                'users' => ['view', 'change_status'],
                'customers' => ['view', 'create', 'edit'],
                'email_invites' => ['send'],
                'yachts' => ['view', 'create', 'edit'],
                'invoices' => ['view', 'create', 'download_pdf'],
                'quotes' => ['view', 'create', 'edit', 'download_pdf'],
                'payments' => ['view', 'create', 'virtual_terminal'],
                'parts' => ['view', 'create', 'edit'],
                'services' => ['view', 'create', 'edit'],
                'appointments' => ['view', 'create', 'edit'],
                'maintenance' => ['view', 'create', 'edit'],
                'email_templates' => ['view', 'edit'],
                'reports' => ['view'],
                'settings' => ['view_own'],
            ],
            // Employee - Similar to Office Staff but more limited
            'employee' => [
                'dashboard' => ['view'],
                'customers' => ['view'],
                'yachts' => ['view'],
                'invoices' => ['view', 'download_pdf'],
                'quotes' => ['view', 'download_pdf'],
                'payments' => ['view'],
                'parts' => ['view'],
                'services' => ['view'],
                'appointments' => ['view', 'create'],
                'maintenance' => ['view'],
                'reports' => ['view'],
                'settings' => ['view_own'],
            ],
            // Customer - Self-service only
            'customer' => [
                'dashboard' => ['view'],
                'yachts' => ['view_own'],
                'invoices' => ['view_own', 'download_pdf'],
                'quotes' => ['view_own', 'download_pdf'],
                'appointments' => ['view_own'],
                'maintenance' => ['view_own'],
                'settings' => ['view_own', 'edit_own'],
            ],
        ];

        foreach ($permissions as $role => $resources) {
            foreach ($resources as $resource => $actions) {
                foreach ($actions as $action) {
                    DB::table('role_permissions')->insert([
                        'role' => $role,
                        'resource' => $resource,
                        'action' => $action,
                        'granted' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
};

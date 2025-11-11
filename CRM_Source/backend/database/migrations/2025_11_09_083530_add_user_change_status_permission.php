<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $now = now();
        $permissions = [
            [
                'role' => 'admin',
                'resource' => 'users',
                'action' => 'change_status',
                'granted' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'role' => 'office_staff',
                'resource' => 'users',
                'action' => 'change_status',
                'granted' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($permissions as $permission) {
            $exists = DB::table('role_permissions')
                ->where('role', $permission['role'])
                ->where('resource', $permission['resource'])
                ->where('action', $permission['action'])
                ->exists();

            if (!$exists) {
                DB::table('role_permissions')->insert($permission);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('role_permissions')
            ->where('resource', 'users')
            ->where('action', 'change_status')
            ->whereIn('role', ['admin', 'office_staff'])
            ->delete();
    }
};



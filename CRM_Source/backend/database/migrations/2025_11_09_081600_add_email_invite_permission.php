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
                'resource' => 'email_invites',
                'action' => 'send',
                'granted' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'role' => 'office_staff',
                'resource' => 'email_invites',
                'action' => 'send',
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
            } else {
                DB::table('role_permissions')
                    ->where('role', $permission['role'])
                    ->where('resource', $permission['resource'])
                    ->where('action', $permission['action'])
                    ->update([
                        'granted' => $permission['granted'],
                        'updated_at' => $now,
                    ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('role_permissions')
            ->where('resource', 'email_invites')
            ->where('action', 'send')
            ->whereIn('role', ['admin', 'office_staff'])
            ->delete();
    }
};



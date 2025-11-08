<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PartVendor;

class PartVendorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $vendors = [
            [
                'name' => 'Defender',
                'slug' => 'defender',
                'website_url' => 'https://www.defender.com',
                'active' => true,
            ],
            [
                'name' => 'Port Supply',
                'slug' => 'port_supply',
                'website_url' => 'https://www.westmarinepro.com',
                'active' => true,
            ],
            [
                'name' => 'McMaster-Carr',
                'slug' => 'mcmaster_carr',
                'website_url' => 'https://www.mcmaster.com',
                'active' => true,
            ],
        ];

        foreach ($vendors as $vendor) {
            PartVendor::updateOrCreate(
                ['slug' => $vendor['slug']],
                $vendor
            );
        }
    }
}


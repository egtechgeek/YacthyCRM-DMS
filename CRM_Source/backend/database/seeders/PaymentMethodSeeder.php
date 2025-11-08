<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMethod;

class PaymentMethodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $methods = [
            ['name' => 'Cash', 'type' => 'cash', 'active' => true],
            ['name' => 'Check', 'type' => 'check', 'active' => true],
            ['name' => 'Bank Transfer', 'type' => 'bank_transfer', 'active' => true],
            ['name' => 'Credit Card', 'type' => 'credit_card', 'active' => true],
            ['name' => 'Other', 'type' => 'other', 'active' => true],
        ];

        foreach ($methods as $method) {
            PaymentMethod::updateOrCreate(
                ['type' => $method['type']],
                $method
            );
        }
    }
}


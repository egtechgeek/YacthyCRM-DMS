<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\PartCategory;

class PartCategorySeeder extends Seeder
{
    /**
     * Run the database seeder.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Marine Parts', 'description' => 'General marine hardware and parts', 'sort_order' => 1],
            ['name' => 'Crew Services', 'description' => 'Crew and staffing services', 'sort_order' => 2],
            ['name' => 'Electronics', 'description' => 'Marine electronics and navigation equipment', 'sort_order' => 3],
            ['name' => 'Engine Parts', 'description' => 'Engine components and replacement parts', 'sort_order' => 4],
            ['name' => 'Electrical', 'description' => 'Electrical systems and components', 'sort_order' => 5],
            ['name' => 'Plumbing', 'description' => 'Plumbing and water systems', 'sort_order' => 6],
            ['name' => 'Safety Equipment', 'description' => 'Safety gear and equipment', 'sort_order' => 7],
            ['name' => 'Maintenance Supplies', 'description' => 'Cleaning and maintenance supplies', 'sort_order' => 8],
            ['name' => 'Canvas & Upholstery', 'description' => 'Canvas work and upholstery', 'sort_order' => 9],
            ['name' => 'Other', 'description' => 'Miscellaneous items', 'sort_order' => 99],
        ];

        foreach ($categories as $category) {
            PartCategory::updateOrCreate(
                ['name' => $category['name']],
                $category
            );
        }
    }
}

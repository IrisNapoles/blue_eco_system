<?php

namespace Database\Seeders;

use App\Models\ShippingRate;
use Illuminate\Database\Seeder;

class ShippingRateSeeder extends Seeder
{
    public function run(): void
    {
        // Edit these fees/day-ranges any time — admin can also adjust
        // them directly in this table (or add a settings screen for it
        // later, same pattern as PaymentSetting).
        $rates = [
            ['tier' => 'same_city',    'fee' => 80,  'min_days' => 1, 'max_days' => 2],
            ['tier' => 'same_region',  'fee' => 150, 'min_days' => 2, 'max_days' => 4],
            ['tier' => 'same_island',  'fee' => 220, 'min_days' => 3, 'max_days' => 6],
            ['tier' => 'cross_island', 'fee' => 350, 'min_days' => 5, 'max_days' => 10],
        ];

        foreach ($rates as $rate) {
            ShippingRate::updateOrCreate(['tier' => $rate['tier']], $rate);
        }
    }
}
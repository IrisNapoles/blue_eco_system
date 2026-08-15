<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@blueeco.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('ChangeThisPassword123'),
                'role' => 'admin',
                'status' => 'active',
                'status_updated_at' => now(),
            ]
        );

        $this->call(ShippingRateSeeder::class);
    }
}
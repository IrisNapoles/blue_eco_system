<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SalesDataSeeder extends Seeder
{
    // How many days back to generate sales for. 45 days gives Prophet a
    // solid amount of history (well above the ~14-day minimum) while
    // staying fast to seed.
    private int $daysBack = 45;

    public function run(): void
    {
        $staff = $this->getOrCreateStaffUser();
        $products = $this->getOrCreateSampleProducts();

        if ($products->isEmpty()) {
            $this->command->warn('No products available — skipping sales seeding.');
            return;
        }

        $totalSales = 0;

        for ($daysAgo = $this->daysBack; $daysAgo >= 0; $daysAgo--) {
            $date = now()->subDays($daysAgo)->startOfDay();
            $isWeekend = $date->isFriday() || $date->isSaturday();

            // More sales on Fri/Sat (mirrors the pattern used when we
            // tested the Prophet service earlier), fewer on other days.
            $salesToday = $isWeekend
                ? rand(6, 10)
                : rand(2, 6);

            for ($i = 0; $i < $salesToday; $i++) {
                $this->createOneSale($date, $staff, $products);
                $totalSales++;
            }
        }

        $this->command->info("Seeded {$totalSales} sales across " . ($this->daysBack + 1) . " days.");
    }

    private function createOneSale($date, User $staff, $products): void
    {
        // Random time during business hours (8 AM - 8 PM) on that date.
        $timestamp = $date->copy()->addHours(rand(8, 19))->addMinutes(rand(0, 59));

        $sale = Sale::create([
            'staff_id' => $staff->id,
            'total_amount' => 0, // updated below once items are known
        ]);
        // created_at/updated_at are auto-set to "now" by Eloquent above —
        // override them directly so the sale lands on the historical date.
        $sale->created_at = $timestamp;
        $sale->updated_at = $timestamp;
        $sale->save();

        $itemCount = rand(1, 4);
        $chosenProducts = $products->random(min($itemCount, $products->count()));
        // ->random() returns a single model instead of a collection when
        // only 1 item is requested — normalize to a collection either way.
        if (!$chosenProducts instanceof \Illuminate\Support\Collection) {
            $chosenProducts = collect([$chosenProducts]);
        }

        $total = 0;

        foreach ($chosenProducts as $product) {
            $quantity = rand(1, 5);
            $price = $product->price;

            $item = SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $product->id,
                'quantity' => $quantity,
                'price' => $price,
            ]);
            $item->created_at = $timestamp;
            $item->updated_at = $timestamp;
            $item->save();

            $total += $quantity * $price;
        }

        $sale->total_amount = $total;
        $sale->save();
    }

    private function getOrCreateStaffUser(): User
    {
        $staff = User::where('role', 'staff')->first();

        if ($staff) {
            return $staff;
        }

        return User::create([
            'name' => 'Demo Staff',
            'username' => 'demo_staff',
            'email' => 'staff-demo@blueeco.com',
            'password' => Hash::make('ChangeThisPassword123'),
            'role' => 'staff',
            'status' => 'active',
            'status_updated_at' => now(),
        ]);
    }

    private function getOrCreateSampleProducts()
    {
        $existing = Product::all();

        if ($existing->isNotEmpty()) {
            return $existing;
        }

        // Only used if your products table is completely empty. If you
        // already added real products through the app, this block is
        // skipped entirely and your real products are used instead.
        $samples = [
            ['name' => 'Organic Compost', 'sku' => 'DEMO-COMP-01', 'form' => 'Granules', 'price' => 250.00, 'weight' => 5.0, 'stock_quantity' => 100],
            ['name' => 'Bio Fertilizer', 'sku' => 'DEMO-FERT-01', 'form' => 'Powder', 'price' => 320.00, 'weight' => 2.5, 'stock_quantity' => 80],
            ['name' => 'Eco Pest Repellent', 'sku' => 'DEMO-PEST-01', 'form' => 'Liquid', 'price' => 180.00, 'weight' => 1.0, 'stock_quantity' => 60],
            ['name' => 'Soil Conditioner', 'sku' => 'DEMO-SOIL-01', 'form' => 'Granules', 'price' => 210.00, 'weight' => 4.0, 'stock_quantity' => 90],
            ['name' => 'Plant Growth Booster', 'sku' => 'DEMO-BOOST-01', 'form' => 'Tablet', 'price' => 150.00, 'weight' => 0.5, 'stock_quantity' => 120],
        ];

        return collect($samples)->map(fn ($data) => Product::create($data));
    }
}
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipping_rates', function (Blueprint $table) {
            $table->id();
            // One of: same_city, same_region, same_island, cross_island.
            // Determined by comparing the shop's origin (see
            // payment_settings.shop_region/shop_city) against the order's
            // delivery_region/delivery_city — see DeliveryEstimateService.
            $table->string('tier')->unique();
            $table->decimal('fee', 10, 2);
            $table->unsignedTinyInteger('min_days');
            $table->unsignedTinyInteger('max_days');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipping_rates');
    }
};
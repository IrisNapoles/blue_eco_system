<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            // The single warehouse/shop's origin location. There's only
            // ever one row in this table (see PaymentSetting::current()),
            // so this doubles as the app's one shipping origin — used by
            // DeliveryEstimateService to compare against each order's
            // delivery_region/delivery_city and pick a shipping tier.
            $table->string('shop_city')->nullable()->after('bank_account_number');
            $table->string('shop_region')->nullable()->after('shop_city');
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->dropColumn(['shop_city', 'shop_region']);
        });
    }
};
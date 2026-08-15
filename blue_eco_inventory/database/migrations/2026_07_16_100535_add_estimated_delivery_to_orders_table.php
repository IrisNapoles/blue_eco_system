<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // System-computed estimate range (distinct from `delivery_date`,
            // which is the date the distributor themselves requested at
            // checkout). Recomputed by DeliveryEstimateService whenever the
            // order is placed or its delivery address changes.
            $table->date('estimated_delivery_min')->nullable()->after('delivery_fee');
            $table->date('estimated_delivery_max')->nullable()->after('estimated_delivery_min');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['estimated_delivery_min', 'estimated_delivery_max']);
        });
    }
};
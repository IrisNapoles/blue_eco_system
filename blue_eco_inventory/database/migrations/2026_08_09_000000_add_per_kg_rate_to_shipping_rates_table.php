<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            // Added on top of the existing `fee` column (which now means
            // "base fee for the first kilogram"). This column is the
            // amount added per additional kilogram (or fraction of a kg,
            // rounded up) beyond the first — see DeliveryEstimateService.
            $table->decimal('per_kg_rate', 10, 2)->default(0)->after('fee');
        });
    }

    public function down(): void
    {
        Schema::table('shipping_rates', function (Blueprint $table) {
            $table->dropColumn('per_kg_rate');
        });
    }
};
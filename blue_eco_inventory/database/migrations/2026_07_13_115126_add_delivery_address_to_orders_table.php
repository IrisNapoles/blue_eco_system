<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Snapshot of the delivery address at the time the order was
            // placed. Deliberately separate from users.street_no/etc so
            // that later edits to the distributor's profile address never
            // change where an already-placed order gets shipped.
            $table->string('delivery_street_no')->nullable()->after('delivery_fee');
            $table->string('delivery_barangay')->nullable()->after('delivery_street_no');
            $table->string('delivery_city')->nullable()->after('delivery_barangay');
            $table->string('delivery_state_province')->nullable()->after('delivery_city');
            $table->string('delivery_region')->nullable()->after('delivery_state_province');
            $table->string('delivery_contact_number')->nullable()->after('delivery_region');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'delivery_street_no',
                'delivery_barangay',
                'delivery_city',
                'delivery_state_province',
                'delivery_region',
                'delivery_contact_number',
            ]);
        });
    }
};
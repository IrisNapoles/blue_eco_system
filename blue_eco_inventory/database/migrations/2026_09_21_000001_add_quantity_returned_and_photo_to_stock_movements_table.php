<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            // How much of `quantity` has been returned to the origin
            // warehouse so far. 0 = still fully "out". `quantity_returned
            // >= quantity` (and `returned_at` set) means fully returned;
            // anything in between is a partial return.
            $table->unsignedInteger('quantity_returned')->default(0)->after('quantity');

            // The frontend's Log Movement form already uploads a "proof of
            // batch moved out" photo, but there was nowhere to store it —
            // it was being silently dropped. Adding it here so it's kept.
            $table->string('photo_path')->nullable()->after('destination');
        });
    }

    public function down(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropColumn(['quantity_returned', 'photo_path']);
        });
    }
};

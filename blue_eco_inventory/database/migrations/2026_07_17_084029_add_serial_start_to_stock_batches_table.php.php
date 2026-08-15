<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_batches', function (Blueprint $table) {
            // Where this stock-in's barcode numbering should start counting
            // from, so a repeat stock-in under the same batch number
            // continues the sequence instead of restarting at 0001.
            $table->unsignedInteger('serial_start')->default(1)->after('printed');
        });
    }

    public function down(): void
    {
        Schema::table('stock_batches', function (Blueprint $table) {
            $table->dropColumn('serial_start');
        });
    }
};
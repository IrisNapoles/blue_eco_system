<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Adds indexes on columns that are frequently filtered or sorted on
    // (Analytics/Reports date-range queries, status filters, stock
    // threshold checks, and the "near expiry" batch lookup), so those
    // queries don't fall back to a full sequential scan as the tables grow.
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('created_at');
            $table->index('status');
        });

        Schema::table('stock_batches', function (Blueprint $table) {
            $table->index('best_before');
        });

        Schema::table('waste_logs', function (Blueprint $table) {
            $table->index('status');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->index('stock_quantity');
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
            $table->dropIndex(['status']);
        });

        Schema::table('stock_batches', function (Blueprint $table) {
            $table->dropIndex(['best_before']);
        });

        Schema::table('waste_logs', function (Blueprint $table) {
            $table->dropIndex(['status']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['stock_quantity']);
        });

        Schema::table('sales', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });
    }
};

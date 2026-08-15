<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            // Nullable + unique: walk-in sales (created by SaleController) have
            // no order_id. Distributor orders get exactly one linked sale row,
            // created when the order first becomes "Shipped" — the unique
            // constraint stops us from ever double-recording the same order.
            $table->foreignId('order_id')
                ->nullable()
                ->unique()
                ->after('staff_id')
                ->constrained('orders')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
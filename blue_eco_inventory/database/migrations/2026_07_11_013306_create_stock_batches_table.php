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
    Schema::create('stock_batches', function (Blueprint $table) {
        $table->id();
        $table->foreignId('product_id')->constrained()->onDelete('cascade');
        $table->string('batch_no');
        $table->integer('quantity');
        $table->string('warehouse')->nullable();
        $table->date('best_before')->nullable();
        $table->timestamps();
    });
}

public function down(): void
{
    Schema::dropIfExists('stock_batches');
}
};

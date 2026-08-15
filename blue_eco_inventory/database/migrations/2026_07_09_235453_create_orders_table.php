<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('orders', function (Blueprint $table) {
        $table->id();
        $table->foreignId('distributor_id')->constrained('users')->onDelete('cascade');
        $table->decimal('total_amount', 10, 2);
        $table->string('payment_method'); // GCash, Bank Transfer, COD
        $table->string('status')->default('Pending'); // Pending, Approved, Shipped, Completed
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};

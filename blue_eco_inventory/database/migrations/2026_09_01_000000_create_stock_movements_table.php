<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_batch_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            // Where the stock is being taken to — e.g. "Parañaque Bazaar".
            // The batch itself still "belongs" to its original warehouse
            // (Farm); this is just a temporary trip, not a re-origin.
            $table->string('destination');
            $table->date('moved_at');
            // Null while the stock is still out at the event/bazaar.
            // Filled in once it's brought back (or fully sold/accounted for).
            $table->date('returned_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};

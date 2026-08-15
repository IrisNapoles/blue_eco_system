<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplies', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('category')->default('Other'); // Packaging Materials, Raw Materials, Equipment, Other
            $table->integer('stock_quantity')->default(0);
            $table->string('unit'); // e.g. rolls, pcs, kg
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplies');
    }
};
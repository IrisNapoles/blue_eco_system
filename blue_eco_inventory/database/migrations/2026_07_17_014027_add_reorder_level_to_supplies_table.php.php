<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supplies', function (Blueprint $table) {
            // Threshold below which the item is considered "Low Stock".
            // Defaults to 20 so existing rows behave the same as before this field existed.
            $table->integer('reorder_level')->default(20)->after('unit');
        });
    }

    public function down(): void
    {
        Schema::table('supplies', function (Blueprint $table) {
            $table->dropColumn('reorder_level');
        });
    }
};
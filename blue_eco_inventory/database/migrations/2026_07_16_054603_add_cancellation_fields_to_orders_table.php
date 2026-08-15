<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    
    public function up()
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('orders', 'cancellation_reason')) {
                $table->string('cancellation_reason', 255)->nullable()->after('cancelled_at');
            }
            if (!Schema::hasColumn('orders', 'cancelled_by')) {
                $table->string('cancelled_by', 50)->nullable()->after('cancellation_reason');
            }
        });
    }

    public function down()
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancellation_reason', 'cancelled_by']);
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // unpaid | proof_submitted | verified | rejected | cod
            $table->string('payment_status')->default('unpaid')->after('payment_method');
            $table->string('proof_of_payment_path')->nullable()->after('payment_status');
            $table->string('payment_reference')->nullable()->after('proof_of_payment_path');
            $table->string('payment_note')->nullable()->after('payment_reference');
            $table->timestamp('payment_verified_at')->nullable()->after('payment_note');
            $table->string('packed_photo_path')->nullable()->after('payment_verified_at');
            $table->timestamp('packed_at')->nullable()->after('packed_photo_path');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'payment_status',
                'proof_of_payment_path',
                'payment_reference',
                'payment_note',
                'payment_verified_at',
                'packed_photo_path',
                'packed_at',
            ]);
        });
    }
};
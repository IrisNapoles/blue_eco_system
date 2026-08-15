<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
{
    Schema::table('orders', function (Blueprint $table) {
        $table->string('delivery_recipient_name')->nullable()->after('delivery_contact_number');
    });
}

public function down()
{
    Schema::table('orders', function (Blueprint $table) {
        $table->dropColumn('delivery_recipient_name');
    });
}
};

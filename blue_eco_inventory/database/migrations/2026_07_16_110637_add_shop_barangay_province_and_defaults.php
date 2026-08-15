<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\PaymentSetting;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->string('shop_barangay')->nullable()->after('shop_city');
            $table->string('shop_province')->nullable()->after('shop_barangay');
        });

        $setting = PaymentSetting::current();
        $setting->shop_barangay = $setting->shop_barangay ?? 'Tiquiwan';
        $setting->shop_city = $setting->shop_city ?? 'Rosario';
        $setting->shop_province = $setting->shop_province ?? 'Batangas';
        $setting->shop_region = $setting->shop_region ?? 'CALABARZON';
        $setting->save();
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->dropColumn(['shop_barangay', 'shop_province']);
        });
    }
};
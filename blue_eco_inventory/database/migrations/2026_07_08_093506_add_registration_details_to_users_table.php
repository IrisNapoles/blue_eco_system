<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->nullable()->after('name');
            $table->unsignedTinyInteger('age')->nullable()->after('username');
            $table->string('gender')->nullable()->after('age');

            // Address Information
            $table->string('street_no')->nullable()->after('email');
            $table->string('barangay')->nullable()->after('street_no');
            $table->string('city')->nullable()->after('barangay');
            $table->string('state_province')->nullable()->after('city');
            $table->string('region')->nullable()->after('state_province');

            // Contact Information
            $table->string('contact_number')->nullable()->after('region');

            // ID Verification
            $table->string('id_type')->nullable()->after('contact_number');
            $table->string('front_id_path')->nullable()->after('id_type');
            $table->string('back_id_path')->nullable()->after('front_id_path');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'username',
                'age',
                'gender',
                'street_no',
                'barangay',
                'city',
                'state_province',
                'region',
                'contact_number',
                'id_type',
                'front_id_path',
                'back_id_path',
            ]);
        });
    }
};
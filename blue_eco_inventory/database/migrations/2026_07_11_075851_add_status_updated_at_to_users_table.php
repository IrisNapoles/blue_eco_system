<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function ($table) {
            $table->timestamp('status_updated_at')->nullable()->after('status');
        });

        // Backfill existing rows so "Active/Inactive since" has something to show
        // instead of blank, using account creation time as a starting point.
        DB::statement('UPDATE users SET status_updated_at = created_at WHERE status_updated_at IS NULL');
    }

    public function down(): void
    {
        Schema::table('users', function ($table) {
            $table->dropColumn('status_updated_at');
        });
    }
};
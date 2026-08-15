<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Add last_login_at column — records when a user last logged in
        Schema::table('users', function ($table) {
            $table->timestamp('last_login_at')->nullable()->after('status');
        });

        // 2) Replace the 'status' check constraint (Postgres enum emulation)
        //    Old values: pending, approved, declined
        //    New values: pending, active, inactive, declined
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');

        // Migrate existing data: 'approved' -> 'active'
        DB::table('users')->where('status', 'approved')->update(['status' => 'active']);

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending','active','inactive','declined'))");
        DB::statement("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active'");
    }

    public function down(): void
    {
        Schema::table('users', function ($table) {
            $table->dropColumn('last_login_at');
        });

        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check');
        DB::table('users')->where('status', 'active')->update(['status' => 'approved']);
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending','approved','declined'))");
        DB::statement("ALTER TABLE users ALTER COLUMN status SET DEFAULT 'approved'");
    }
};
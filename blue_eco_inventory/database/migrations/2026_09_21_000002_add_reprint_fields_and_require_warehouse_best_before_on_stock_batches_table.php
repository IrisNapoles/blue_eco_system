<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Uses raw SQL for the NOT NULL changes (instead of Schema's ->change(),
// which needs doctrine/dbal — not currently installed in this project) so
// this runs with no extra composer dependency. Written for Postgres
// (this app's DB_CONNECTION); adjust the ALTER TABLE syntax if you ever
// switch drivers.

return new class extends Migration
{
    public function up(): void
    {
        // Backfill any existing rows before enforcing NOT NULL below, so
        // this migration doesn't fail on data saved before these fields
        // were required. Adjust the fallbacks if you'd rather handle old
        // rows by hand instead.
        DB::table('stock_batches')->whereNull('warehouse')->update(['warehouse' => 'Farm Warehouse']);
        DB::table('stock_batches')->whereNull('best_before')->update(['best_before' => now()->addYear()]);

        DB::statement('ALTER TABLE stock_batches ALTER COLUMN warehouse SET NOT NULL');
        DB::statement('ALTER TABLE stock_batches ALTER COLUMN best_before SET NOT NULL');

        Schema::table('stock_batches', function (Blueprint $table) {
            // Only ever set on an actual *re*print (2nd+ time). The first
            // print doesn't need a reason or an attributed user.
            $table->text('reprint_reason')->nullable()->after('printed');
            $table->foreignId('reprinted_by')
                ->nullable()
                ->after('reprint_reason')
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('reprinted_at')->nullable()->after('reprinted_by');
        });
    }

    public function down(): void
    {
        Schema::table('stock_batches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reprinted_by');
            $table->dropColumn(['reprint_reason', 'reprinted_at']);
        });

        DB::statement('ALTER TABLE stock_batches ALTER COLUMN warehouse DROP NOT NULL');
        DB::statement('ALTER TABLE stock_batches ALTER COLUMN best_before DROP NOT NULL');
    }
};

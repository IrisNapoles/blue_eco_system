<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Movements now literally move stock between StockBatch rows (origin row
// shrinks, a new row is created at the destination warehouse) instead of
// just being tracked as a temporary "trip". Two things follow from that:
//
// 1. We need a way back — `destination_stock_batch_id` links a movement to
//    the row it created/added to at the destination, so a return knows
//    exactly where to pull stock back from.
// 2. A batch row can now be fully emptied by a movement (all of it moved
//    out) and deleted, same as StockService::deduct already does for
//    sales. `stock_batch_id` was `cascadeOnDelete()`, which would silently
//    wipe the movement's history the moment that happens. We switch it to
//    `nullOnDelete()` and snapshot the fields the UI needs (batch_no,
//    origin_warehouse, best_before, printed) directly onto the movement so
//    the Transfer Log still reads correctly even after the batch row it
//    pointed to is gone.

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->string('batch_no')->nullable()->after('stock_batch_id');
            $table->foreignId('product_id')->nullable()->after('batch_no')->constrained()->nullOnDelete();
            $table->string('origin_warehouse')->nullable()->after('product_id');
            $table->date('best_before')->nullable()->after('origin_warehouse');
            $table->boolean('printed')->default(false)->after('best_before');
            $table->foreignId('destination_stock_batch_id')
                ->nullable()
                ->after('destination')
                ->constrained('stock_batches')
                ->nullOnDelete();
        });

        // Backfill snapshots for any movements that already exist, from
        // their current stock_batch, before the FK is loosened below.
        DB::statement(<<<SQL
        UPDATE stock_movements AS m
        SET batch_no = b.batch_no,
        product_id = b.product_id,
        origin_warehouse = b.warehouse,
        best_before = b.best_before,
        printed = b.printed
        FROM stock_batches AS b
        WHERE b.id = m.stock_batch_id
        SQL);

        // Raw SQL (not Schema's ->change(), which needs doctrine/dbal —
        // not installed in this project) to loosen stock_batch_id from
        // required+cascade to nullable+set-null.
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN stock_batch_id DROP NOT NULL');
        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_stock_batch_id_foreign');
        DB::statement(
            'ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_batch_id_foreign '
            . 'FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id) ON DELETE SET NULL'
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE stock_movements DROP CONSTRAINT stock_movements_stock_batch_id_foreign');
        DB::statement(
            'ALTER TABLE stock_movements ADD CONSTRAINT stock_movements_stock_batch_id_foreign '
            . 'FOREIGN KEY (stock_batch_id) REFERENCES stock_batches(id) ON DELETE CASCADE'
        );
        DB::statement('ALTER TABLE stock_movements ALTER COLUMN stock_batch_id SET NOT NULL');

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('destination_stock_batch_id');
            $table->dropConstrainedForeignId('product_id');
            $table->dropColumn(['batch_no', 'origin_warehouse', 'best_before', 'printed']);
        });
    }
};

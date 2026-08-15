<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockBatch;

class StockService
{
    /**
     * Reduce a product's stock by $quantity, keeping BOTH sources of truth
     * in sync:
     *   - products.stock_quantity  (the running total shown on the Product
     *     screen)
     *   - stock_batches            (the per-batch breakdown the Admin
     *     Dashboard reads for low-stock alerts and warehouse totals)
     *
     * Batches are consumed FIFO by best_before (soonest-to-expire first;
     * batches with no expiry date are treated as "never expires" and
     * consumed last).
     *
     * Call this instead of Product::decrement('stock_quantity', ...)
     * anywhere stock leaves the system: order shipped, walk-in sale, waste
     * log, etc. Must be called from inside a DB::transaction() by the
     * caller — this method takes row locks but does not open its own
     * transaction.
     */
    public static function deduct(Product $product, int $quantity): void
    {
        $product = Product::lockForUpdate()->findOrFail($product->id);

        if ($product->stock_quantity < $quantity) {
            abort(422, "Not enough stock for {$product->name}. Available: {$product->stock_quantity}, needed: {$quantity}.");
        }

        $product->decrement('stock_quantity', $quantity);

        $remaining = $quantity;

        $batches = StockBatch::where('product_id', $product->id)
            ->orderByRaw('best_before IS NULL, best_before ASC')
            ->orderBy('created_at')
            ->lockForUpdate()
            ->get();

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }

            if ($batch->quantity <= $remaining) {
                $remaining -= $batch->quantity;
                $batch->delete();
            } else {
                $batch->decrement('quantity', $remaining);
                $remaining = 0;
            }
        }

        // If we still have leftover here, stock_batches was already out of
        // sync with stock_quantity before this call (e.g. stock was added
        // by editing the product directly instead of a proper "stock in").
        // We don't fail the sale/shipment over it — stock_quantity was
        // already validated as sufficient above — but it's worth a log
        // entry so an admin can go reconcile the batches.
        if ($remaining > 0) {
            logger()->warning(
                "StockService::deduct — product #{$product->id} ({$product->name}) "
                . "had insufficient stock_batches records to cover a deduction of "
                . "{$quantity}. Short by {$remaining}."
            );
        }
    }

    /**
     * Return stock to a product without recreating batch history (used
     * when a shipped order is later cancelled). This only restores
     * products.stock_quantity — it does NOT recreate the original batches,
     * since we can't know which batch(es) the units originally came from.
     * The returned units show up in the Product screen total immediately;
     * an admin may want to log a fresh "stock in" batch for them if
     * batch-level tracking on the Dashboard needs to reflect the return too.
     */
    public static function restore(Product $product, int $quantity): void
    {
        Product::where('id', $product->id)->increment('stock_quantity', $quantity);
    }
}
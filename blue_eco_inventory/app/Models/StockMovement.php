<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_batch_id',
        'batch_no',
        'product_id',
        'origin_warehouse',
        'best_before',
        'printed',
        'quantity',
        'quantity_returned',
        'destination',
        'destination_stock_batch_id',
        'moved_at',
        'returned_at',
        'photo_path',
        'notes',
    ];

    protected $casts = [
        'moved_at' => 'date:Y-m-d',
        'returned_at' => 'date:Y-m-d',
        'best_before' => 'date:Y-m-d',
        'printed' => 'boolean',
        'quantity' => 'integer',
        'quantity_returned' => 'integer',
    ];

    // May be null once the origin batch has been fully moved out and
    // deleted — batch_no/product_id/origin_warehouse/best_before/printed
    // above are snapshotted at creation time precisely so the Transfer Log
    // still reads correctly even then.
    public function stockBatch()
    {
        return $this->belongsTo(StockBatch::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // The row this movement created/added to at the destination warehouse
    // — where a return pulls stock back from. May also become null if
    // that row is later fully depleted and deleted.
    public function destinationStockBatch()
    {
        return $this->belongsTo(StockBatch::class, 'destination_stock_batch_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockBatch extends Model
{
    protected $fillable = [
        'product_id',
        'batch_no',
        'quantity',
        'warehouse',
        'best_before',
        'serial_start',
        'printed',
    ];

    protected function casts(): array
    {
        return [
            'best_before' => 'date',
            'printed' => 'boolean',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /// True if [serial] (the numeric suffix printed on a unit's barcode,
    /// e.g. 1 for "...-0001") was printed as part of THIS stock-in batch —
    /// each StockBatch row owns a contiguous serial range starting at
    /// serial_start, since the same batch_no can be restocked more than
    /// once (see StockBatchController::store()'s priorQuantity logic).
    public function ownsSerial(int $serial): bool
    {
        return $serial >= $this->serial_start
            && $serial < $this->serial_start + $this->quantity;
    }
}
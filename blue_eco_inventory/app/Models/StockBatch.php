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
        'reprint_reason',
    ];

    protected function casts(): array
    {
        return [
            'best_before' => 'date',
            'printed' => 'boolean',
            'reprinted_at' => 'datetime',
        ];
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function reprintedBy()
    {
        return $this->belongsTo(User::class, 'reprinted_by');
    }

    /// True if [serial] (the numeric suffix printed on a unit's barcode,
    /// e.g. 1 for "...-0001") was printed as part of THIS stock-in batch —
    /// each StockBatch row owns a contiguous serial range starting at
    /// serial_start, since the same batch_no can be restocked more than
    /// once (see StockBatchController::store()'s priorQuantity logic), and
    /// a movement now slices off a sub-range into its own row too (see
    /// StockMovementController::store()).
    public function ownsSerial(int $serial): bool
    {
        return $serial >= $this->serial_start
            && $serial < $this->serial_start + $this->quantity;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_batch_id',
        'quantity',
        'destination',
        'moved_at',
        'returned_at',
        'notes',
    ];

    protected $casts = [
        'moved_at' => 'date:Y-m-d',
        'returned_at' => 'date:Y-m-d',
    ];

    public function stockBatch()
    {
        return $this->belongsTo(StockBatch::class);
    }
}

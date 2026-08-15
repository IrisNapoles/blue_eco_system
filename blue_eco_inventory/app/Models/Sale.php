<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sale extends Model
{
    protected $fillable = ['staff_id', 'order_id', 'total_amount'];

    public function items()
    {
        return $this->hasMany(SaleItem::class);
    }

    // Present only for sales that were auto-generated from a distributor
    // order (see OrderController::updateStatus). Null for walk-in sales.
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
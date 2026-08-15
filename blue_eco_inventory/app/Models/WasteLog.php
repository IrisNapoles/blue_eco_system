<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WasteLog extends Model
{
    protected $fillable = [
        'product_id',
        'staff_id',
        'quantity',
        'reason',
        'status',
        'image_path',
    ];

    protected $appends = ['image_url'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path;
    }
}
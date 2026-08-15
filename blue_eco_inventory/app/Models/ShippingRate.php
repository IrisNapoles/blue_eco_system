<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingRate extends Model
{
    protected $fillable = [
        'tier',
        'fee',
        'min_days',
        'max_days',
    ];

    protected function casts(): array
    {
        return [
            'fee' => 'decimal:2',
        ];
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supply extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'stock_quantity',
        'unit',
        'reorder_level',
        'image_path',
    ];
}
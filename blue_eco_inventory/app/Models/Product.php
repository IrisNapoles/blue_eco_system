<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'sku', 'form', 'system_code', 'price', 'weight', 'stock_quantity', 'description', 'image_path'])]
class Product extends Model
{
    use HasFactory;
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    protected $fillable = [
        'gcash_qr_path',
        'gcash_account_name',
        'gcash_account_number',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'shop_city',
        'shop_barangay',
        'shop_province',
        'shop_region',
    ];

    // There's only ever one row — this fetches (and creates if missing) that row.
    public static function current(): self
    {
        return static::firstOrCreate(['id' => 1]);
    }
}
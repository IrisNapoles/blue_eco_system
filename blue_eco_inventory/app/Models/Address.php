<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    protected $fillable = [
        'user_id',
        'recipient_name',
        'contact_number',
        'street_no',
        'barangay',
        'city',
        'state_province',
        'region',
        'is_default',
    ];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

        protected $appends = ['combined_address'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getCombinedAddressAttribute(): string
    {
        $parts = array_filter([
            $this->street_no,
            $this->barangay,
            $this->city,
            $this->state_province,
            $this->region,
        ]);

        return implode(', ', $parts);
    }
}
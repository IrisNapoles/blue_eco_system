<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'distributor_id',
        'total_amount',
        'payment_method',
        'status',
        'delivery_date',
        'delivery_fee',
        'estimated_delivery_min',
        'estimated_delivery_max',
        'delivery_street_no',
        'delivery_barangay',
        'delivery_city',
        'delivery_state_province',
        'delivery_region',
        'delivery_contact_number',
        'delivery_recipient_name',
        'payment_status',
        'proof_of_payment_path',
        'payment_reference',
        'payment_note',
        'payment_verified_at',
        'packed_photo_path',
        'packed_at',
        'received_at',
        'cancelled_at',
        'cancellation_reason',
        'cancelled_by',
    ];

    // So the Flutter app gets ready-to-use URLs/strings without building
    // them itself.
    protected $appends = ['proof_of_payment_url', 'packed_photo_url', 'delivery_address'];

    protected function casts(): array
    {
        return [
            'delivery_date' => 'date',
            'estimated_delivery_min' => 'date',
            'estimated_delivery_max' => 'date',
            'payment_verified_at' => 'datetime',
            'packed_at' => 'datetime',
            'received_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function distributor()
    {
        return $this->belongsTo(User::class, 'distributor_id');
    }

    public function getProofOfPaymentUrlAttribute(): ?string
    {
        return $this->proof_of_payment_path;
    }

    public function getPackedPhotoUrlAttribute(): ?string
    {
        return $this->packed_photo_path;
    }

    public function getDeliveryAddressAttribute(): ?string
    {
        $parts = array_filter([
            $this->delivery_recipient_name,
            $this->delivery_street_no,
            $this->delivery_barangay,
            $this->delivery_city,
            $this->delivery_state_province,
            $this->delivery_region,
        ]);

        return $parts ? implode(', ', $parts) : null;
    }
}
<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * One flexible notification used for every order/payment event:
 * payment_instructions, order_placed, proof_submitted, payment_verified,
 * payment_rejected, order_packed, order_status.
 *
 * Stored via Laravel's database notification channel, so it lands in the
 * `notifications` table and is readable via $user->notifications.
 */
class OrderNotification extends Notification
{
    public function __construct(
        public string $type,
        public string $title,
        public string $body,
        public ?int $orderId = null,
        public ?string $imageUrl = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'order_id' => $this->orderId,
            'image_url' => $this->imageUrl,
        ];
    }
}
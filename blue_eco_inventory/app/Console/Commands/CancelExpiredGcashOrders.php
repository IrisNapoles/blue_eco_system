<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Notifications\OrderNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CancelExpiredGcashOrders extends Command
{
    protected $signature = 'orders:cancel-expired-gcash';

    protected $description = 'Auto-cancel Pending GCash orders with no proof of payment uploaded within 1 hour of being placed.';

    public function handle(): int
    {
        $cutoff = now()->subHour();

        $expiredOrders = Order::where('payment_method', 'GCash')
            ->where('payment_status', 'unpaid')
            ->where('status', 'Pending')
            ->where('created_at', '<=', $cutoff)
            ->get();

        foreach ($expiredOrders as $order) {
            DB::transaction(function () use ($order) {
                $order->status = 'Cancelled';
                $order->cancelled_at = now();
                $order->cancellation_reason = 'Proof of payment was not uploaded within 1 hour.';
                $order->cancelled_by = 'System';
                $order->save();
            });

            $order->distributor->notify(new OrderNotification(
                'order_expired',
                'Order automatically cancelled',
                "Order #{$order->id} was cancelled because proof of payment for GCash wasn't uploaded within 1 hour.",
                $order->id,
            ));

            $this->info("Cancelled expired order #{$order->id}");
        }

        return self::SUCCESS;
    }
}
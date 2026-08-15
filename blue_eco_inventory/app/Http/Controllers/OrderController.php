<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Notifications\OrderNotification;
use App\Services\CloudinaryService;
use App\Services\DeliveryEstimateService;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class OrderController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    public function index(Request $request)
    {
        return Order::with('items.product')
            ->where('distributor_id', $request->user()->id)
            ->latest()
            ->get();
    }

    public function deliveryEstimate(Request $request, DeliveryEstimateService $estimator)
    {
        $validated = $request->validate([
            'region' => 'required|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $productIds = collect($validated['items'])->pluck('product_id');
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $totalWeightGrams = 0;
        foreach ($validated['items'] as $item) {
            $product = $products->get($item['product_id']);
            if ($product && $product->weight) {
                $totalWeightGrams += $product->weight * $item['quantity'];
            }
        }
        $totalWeightKg = (float) ($totalWeightGrams / 1000);

        $estimate = $estimator->estimate($validated['region'], $totalWeightKg);

        return response()->json([
            'zone' => $estimate['zone'],
            'fee' => $estimate['fee'],
            'weight_kg' => $estimate['weight_kg'],
            'min_date' => $estimate['min_date']->toDateString(),
            'max_date' => $estimate['max_date']->toDateString(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|string|in:GCash,Bank Transfer,COD',
            'delivery_fee' => 'required|numeric|min:0',
            'delivery_date' => 'nullable|date|after_or_equal:today',
            'delivery_street_no' => 'required|string|max:255',
            'delivery_barangay' => 'required|string|max:255',
            'delivery_city' => 'required|string|max:255',
            'delivery_state_province' => 'required|string|max:255',
            'delivery_region' => 'required|string|max:255',
            'delivery_contact_number' => 'required|string|max:30',
            'delivery_recipient_name' => 'nullable|string|max:255',
        ]);

        $order = DB::transaction(function () use ($validated, $request) {
            $total = 0;
            $lines = [];

            foreach ($validated['items'] as $item) {
                $product = Product::lockForUpdate()->findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity']) {
                    abort(422, "Not enough stock for {$product->name}. Available: {$product->stock_quantity}, requested: {$item['quantity']}.");
                }

                $total += $product->price * $item['quantity'];
                $lines[] = ['product' => $product, 'quantity' => $item['quantity']];
            }

            $deliveryFee = $validated['delivery_fee'];

            $order = Order::create([
                'distributor_id' => $request->user()->id,
                'total_amount' => $total + $deliveryFee,
                'payment_method' => $validated['payment_method'],
                'delivery_date' => $validated['delivery_date'] ?? null,
                'delivery_fee' => $deliveryFee,
                'delivery_street_no' => $validated['delivery_street_no'],
                'delivery_barangay' => $validated['delivery_barangay'],
                'delivery_city' => $validated['delivery_city'],
                'delivery_state_province' => $validated['delivery_state_province'],
                'delivery_region' => $validated['delivery_region'],
                'delivery_contact_number' => $validated['delivery_contact_number'],
                'status' => 'Pending',
                'payment_status' => $validated['payment_method'] === 'COD' ? 'cod' : 'unpaid',
                'delivery_recipient_name' => $validated['delivery_recipient_name'] ?? null,
            ]);

            foreach ($lines as $entry) {
                $order->items()->create([
                    'product_id' => $entry['product']->id,
                    'quantity' => $entry['quantity'],
                    'price' => $entry['product']->price,
                ]);
            }

            return $order;
        });

        $this->sendPlacementNotification($order, $request->user());

        return response()->json($order->load('items.product'), 201);
    }

    private function sendPlacementNotification(Order $order, User $distributor): void
    {
        if ($order->payment_method === 'COD') {
            $distributor->notify(new OrderNotification(
                'order_placed',
                'Order submitted',
                "Order #{$order->id} has been submitted. Payment will be made upon delivery (Cash on Delivery).",
                $order->id,
            ));
            return;
        }

        $setting = PaymentSetting::current();

        if ($order->payment_method === 'GCash') {
            $body = "Pay for Order #{$order->id} using GCash: {$setting->gcash_account_name} ({$setting->gcash_account_number}). After paying, upload proof of payment in My Orders.";
            $imageUrl = $setting->gcash_qr_path ?: null;
        } else { // Bank Transfer
            $body = "Pay for Order #{$order->id} using Bank Transfer: {$setting->bank_name} — {$setting->bank_account_name} ({$setting->bank_account_number}). After paying, upload proof of payment and reference number in My Orders.";
            $imageUrl = null;
        }

        $distributor->notify(new OrderNotification(
            'payment_instructions',
            'Complete your payment',
            $body,
            $order->id,
            $imageUrl,
        ));
    }

    // Distributor: upload a screenshot/receipt as proof of payment for a
    // GCash or Bank Transfer order, then notify all admins to review it.
    public function uploadProof(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->distributor_id !== $request->user()->id) {
            abort(403, 'This is not your order.');
        }
        if ($order->payment_method === 'COD') {
            abort(422, 'COD orders do not need proof of payment.');
        }
        if ($order->payment_status === 'verified') {
            abort(422, 'Payment for this order is already verified.');
        }

        $validated = $request->validate([
            'proof' => 'required|image|max:5120',
            'reference' => 'nullable|string|max:100',
        ]);

        $path = $this->cloudinary->upload($request->file('proof'), 'payment_proofs');

        $order->proof_of_payment_path = $path;
        $order->payment_reference = $validated['reference'] ?? $order->payment_reference;
        $order->payment_status = 'proof_submitted';
        $order->payment_note = null;
        $order->save();

        $admins = User::where('role', 'admin')->get();
        Notification::send($admins, new OrderNotification(
            'proof_submitted',
            'New proof of payment',
            "{$request->user()->name} uploaded proof of payment for Order #{$order->id}. Please verify.",
            $order->id,
        ));

        return response()->json([
            'message' => 'Proof of payment uploaded',
            'order' => $order->load('items.product'),
        ]);
    }

    // Distributor: change the delivery address on an order before it has
    // shipped. Sends a full snapshot of the address (same fields as
    // store()), so it simply overwrites the existing delivery_* columns.
    public function updateDeliveryAddress(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->distributor_id !== $request->user()->id) {
            abort(403, 'This is not your order.');
        }
        if (in_array($order->status, ['Shipped', 'Completed', 'Cancelled'])) {
            abort(422, 'This order can no longer have its delivery address changed.');
        }

        $validated = $request->validate([
            'delivery_street_no' => 'required|string|max:255',
            'delivery_barangay' => 'required|string|max:255',
            'delivery_city' => 'required|string|max:255',
            'delivery_state_province' => 'required|string|max:255',
            'delivery_region' => 'required|string|max:255',
            'delivery_contact_number' => 'required|string|max:30',
            'delivery_recipient_name' => 'nullable|string|max:255',
        ]);

        $order->delivery_street_no = $validated['delivery_street_no'];
        $order->delivery_barangay = $validated['delivery_barangay'];
        $order->delivery_city = $validated['delivery_city'];
        $order->delivery_state_province = $validated['delivery_state_province'];
        $order->delivery_region = $validated['delivery_region'];
        $order->delivery_contact_number = $validated['delivery_contact_number'];
        $order->delivery_recipient_name = $validated['delivery_recipient_name'] ?? null;
        $order->save();

        return response()->json([
            'message' => 'Delivery address updated',
            'order' => $order->load('items.product'),
        ]);
    }

    // Distributor: change the payment method on an order before payment has
    // been verified and before it has shipped. Switching methods clears out
    // any proof/reference from the old method (it no longer applies) and
    // resets payment_status the same way store() sets it initially.
    public function updatePaymentMethod(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->distributor_id !== $request->user()->id) {
            abort(403, 'This is not your order.');
        }
        if (in_array($order->status, ['Shipped', 'Completed', 'Cancelled'])) {
            abort(422, 'This order can no longer have its payment method changed.');
        }
        if ($order->payment_status === 'verified') {
            abort(422, 'Payment has already been verified; the payment method can no longer be changed.');
        }

        $validated = $request->validate([
            'payment_method' => 'required|string|in:GCash,Bank Transfer,COD',
        ]);

        $newMethod = $validated['payment_method'];

        $order->payment_method = $newMethod;
        $order->payment_status = $newMethod === 'COD' ? 'cod' : 'unpaid';
        $order->proof_of_payment_path = null;
        $order->payment_reference = null;
        $order->payment_note = null;
        $order->payment_verified_at = null;
        $order->save();

        // Re-send the same "how to pay" instructions used at order
        // placement, since the buyer now needs to pay a different way.
        $this->sendPlacementNotification($order, $request->user());

        return response()->json([
            'message' => 'Payment method updated',
            'order' => $order->load('items.product'),
        ]);
    }

    // Distributor: Cancel a pending order before it is processed.
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->distributor_id !== $request->user()->id) {
            abort(403, 'This is not your order.');
        }
        if ($order->status !== 'Pending') {
            abort(422, 'Only pending orders can be cancelled.');
        }

        $validated = $request->validate([
            'cancellation_reason' => 'nullable|string|max:255',
            'cancelled_by' => 'nullable|string|max:50',
        ]);

        $order->status = 'Cancelled';
        $order->cancelled_at = now();
        $order->cancellation_reason = $validated['cancellation_reason'] ?? null;
        $order->cancelled_by = $validated['cancelled_by'] ?? null;
        $order->save();

        return response()->json([
            'message' => 'Order cancelled',
            'order' => $order->load('items.product'),
        ]);
    }

    // Admin: verify or reject a submitted proof of payment.
    public function verifyPayment(Request $request, $id)
    {
        $validated = $request->validate([
            'action' => 'required|string|in:verify,reject',
            'note' => 'nullable|string|max:255',
        ]);

        $order = Order::findOrFail($id);

        if ($order->payment_method === 'COD') {
            abort(422, 'COD orders do not require payment verification.');
        }
        if ($order->payment_status !== 'proof_submitted') {
            abort(422, 'This order has no pending proof of payment to review.');
        }

        if ($validated['action'] === 'verify') {
            $order->payment_status = 'verified';
            $order->payment_verified_at = now();
            $order->payment_note = null;
            $title = 'Your payment has been verified';
            $body = "Your payment for Order #{$order->id} has been confirmed. Your order is now being prepared.";
            $type = 'payment_verified';
        } else {
            $order->payment_status = 'rejected';
            $order->payment_note = $validated['note'] ?? 'Proof of payment could not be verified. Please upload again.';
            $title = 'Please re-upload proof of payment';
            $body = "Order #{$order->id}: {$order->payment_note}";
            $type = 'payment_rejected';
        }

        $order->save();

        $order->distributor->notify(new OrderNotification($type, $title, $body, $order->id));

        return response()->json([
            'message' => 'Payment status updated',
            'order' => $order->load('items.product'),
        ]);
    }

    // J&T Express shipping-day ranges by destination island group, assuming
    // a single origin warehouse in Luzon (outside Metro Manila). Mirrors
    // OrderModel._kJntDaysFromLuzonOrigin / _destinationGroup() on the
    // Flutter side, and falls back to Luzon for an unrecognized region the
    // same way DeliveryFeeCalculator::bucketForRegion() does — keep the two
    // in sync if either changes.
    private function estimatedDeliveryDaysForRegion(?string $region): array
    {
        $normalized = strtolower(trim($region ?? ''));

        $days = [
            'ncr' => [1, 5],
            'luzon' => [1, 5],
            'visayas' => [3, 7],
            'mindanao' => [3, 7],
            'island' => [5, 6],
        ];

        if (str_contains($normalized, 'mimaropa')) {
            return $days['island'];
        }
        if (str_contains($normalized, 'ncr') || str_contains($normalized, 'national capital')) {
            return $days['ncr'];
        }

        $luzonNames = ['cordillera', 'car', 'ilocos', 'cagayan valley', 'central luzon', 'calabarzon', 'bicol'];
        foreach ($luzonNames as $n) {
            if (str_contains($normalized, $n)) return $days['luzon'];
        }

        $visayasNames = ['western visayas', 'central visayas', 'eastern visayas'];
        foreach ($visayasNames as $n) {
            if (str_contains($normalized, $n)) return $days['visayas'];
        }

        $mindanaoNames = ['zamboanga', 'northern mindanao', 'davao', 'soccsksargen', 'caraga', 'barmm', 'muslim mindanao'];
        foreach ($mindanaoNames as $n) {
            if (str_contains($normalized, $n)) return $days['mindanao'];
        }

        // Unrecognized region string — default to Luzon, same fallback
        // DeliveryFeeCalculator::bucketForRegion() uses.
        return $days['luzon'];
    }

    // Admin: upload a photo showing the order has been packed and is ready to ship.
    public function uploadPackedPhoto(Request $request, $id)
    {
        $validated = $request->validate([
            'photo' => 'required|image|max:5120',
        ]);

        $order = Order::findOrFail($id);
        $path = $this->cloudinary->upload($request->file('photo'), 'packed_photos');

        $order->packed_photo_path = $path;
        $order->packed_at = now();

        [$minDays, $maxDays] = $this->estimatedDeliveryDaysForRegion($order->delivery_region);
        $order->estimated_delivery_min = $order->packed_at->copy()->addDays($minDays);
        $order->estimated_delivery_max = $order->packed_at->copy()->addDays($maxDays);

        $order->save();

        $order->distributor->notify(new OrderNotification(
            'order_packed',
            'Your order has been packed',
            "Order #{$order->id} is ready to be shipped.",
            $order->id,
            $path,
        ));

        return response()->json([
            'message' => 'Packed photo uploaded',
            'order' => $order->load('items.product'),
        ]);
    }

    // Admin view of ALL distributor orders
    public function adminIndex()
    {
        return Order::with('items.product', 'distributor')->latest()->get();
    }

    // Admin moves an order through its lifecycle
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Pending,Approved,Packing,Ready for Pickup,Shipped,Completed,Cancelled',
        ]);

        $order = DB::transaction(function () use ($validated, $request, $id) {
            $order = Order::with('items.product')->lockForUpdate()->findOrFail($id);
            $previousStatus = $order->status;
            $newStatus = $validated['status'];

            if ($newStatus === 'Shipped' && $previousStatus !== 'Shipped') {
                foreach ($order->items as $item) {
                    StockService::deduct($item->product, $item->quantity);
                }

                $sale = Sale::create([
                    'staff_id' => $request->user()->id,
                    'order_id' => $order->id,
                    'total_amount' => $order->items->sum(fn ($item) => $item->price * $item->quantity),
                ]);

                foreach ($order->items as $item) {
                    $sale->items()->create([
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'price' => $item->price,
                    ]);
                }
            }

            if ($newStatus === 'Cancelled' && $previousStatus === 'Shipped') {
                foreach ($order->items as $item) {
                    StockService::restore($item->product, $item->quantity);
                }

                Sale::where('order_id', $order->id)->delete();
            }

            $order->status = $newStatus;
            $order->save();

            return $order;
        });

        $order->distributor->notify(new OrderNotification(
            'order_status',
            'Order update',
            "Order #{$order->id} is now \"{$order->status}\".",
            $order->id,
        ));

        return response()->json([
            'message' => 'Order status updated',
            'order' => $order->load('items.product'),
        ]);

    }

    // Distributor: confirm that a shipped order has been received.
    public function markReceived(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        if ($order->distributor_id !== $request->user()->id) {
            abort(403, 'This is not your order.');
        }
        if ($order->status !== 'Shipped') {
            abort(422, 'Only shipped orders can be marked as received.');
        }

        $order->status = 'Completed';
        $order->received_at = now();
        $order->save();

        return response()->json([
            'message' => 'Order marked as received',
            'order' => $order->load('items.product'),
        ]);
    }
}

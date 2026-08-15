<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Sale;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends Controller
{
    public function index()
    {
        return Sale::with('items.product')->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $total = 0;
            $products = [];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                if ($product->stock_quantity < $item['quantity']) {
                    abort(422, "Not enough stock for {$product->name}");
                }

                $total += $product->price * $item['quantity'];
                $products[] = ['product' => $product, 'quantity' => $item['quantity']];
            }

            $sale = Sale::create([
                'staff_id' => $request->user()->id,
                'total_amount' => $total,
            ]);

            foreach ($products as $entry) {
                $sale->items()->create([
                    'product_id' => $entry['product']->id,
                    'quantity' => $entry['quantity'],
                    'price' => $entry['product']->price,
                ]);

                // Keeps products.stock_quantity AND stock_batches in sync
                // (FIFO by expiry) so the Admin Dashboard reflects walk-in
                // sales too, not just the Product screen.
                StockService::deduct($entry['product'], $entry['quantity']);
            }

            return response()->json($sale->load('items.product'), 201);
        });
    }
}
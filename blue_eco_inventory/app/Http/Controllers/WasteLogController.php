<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\WasteLog;
use App\Services\CloudinaryService;
use App\Services\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WasteLogController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    public function index(Request $request)
    {
        return WasteLog::with('product')->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|max:255',
            'image' => 'nullable|image|mimes:jpg,jpeg,png|max:5120',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $product = Product::findOrFail($validated['product_id']);

            if ($product->stock_quantity < $validated['quantity']) {
                abort(422, "Not enough stock for {$product->name} to log this waste.");
            }

            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $this->cloudinary->upload($request->file('image'), 'waste-logs');
            }

            $log = WasteLog::create([
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'staff_id' => $request->user()->id,
                'image_path' => $imagePath,
            ]);

            // Keeps products.stock_quantity AND stock_batches in sync (FIFO
            // by expiry) so the Admin Dashboard reflects logged waste too,
            // not just the Product screen.
            StockService::deduct($product, $validated['quantity']);

            return response()->json($log->load('product'), 201);
        });
    }

    // Admin reviews a logged waste entry (NEW)
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:Logged for Review,Confirmed,Rejected',
        ]);

        $log = WasteLog::findOrFail($id);
        $log->status = $validated['status'];
        $log->save();

        return response()->json([
            'message' => 'Waste log status updated',
            'log' => $log->load('product'),
        ]);
    }
}
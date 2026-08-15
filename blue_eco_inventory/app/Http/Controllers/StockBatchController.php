<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockBatchController extends Controller
{
    public function index()
    {
        return StockBatch::with('product')->latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'batch_no' => 'required|string|max:100',
            'quantity' => 'required|integer|min:1',
            'warehouse' => 'nullable|string',
            'best_before' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated) {
            // Continue barcode numbering from wherever the last stock-in for
            // this batch number left off (same product + batch_no), instead
            // of always restarting at 0001.
            $priorQuantity = StockBatch::where('product_id', $validated['product_id'])
                ->where('batch_no', $validated['batch_no'])
                ->sum('quantity');

            $batch = StockBatch::create([
                ...$validated,
                'serial_start' => $priorQuantity + 1,
            ]);

            Product::where('id', $validated['product_id'])
                ->increment('stock_quantity', $validated['quantity']);

            return response()->json($batch->load('product'), 201);
        });
    }

    // Suggests the next batch number for a given product
    public function nextBatchNumber(Request $request)
    {
        $request->validate(['product_id' => 'required|exists:products,id']);

        $product = Product::findOrFail($request->product_id);
        $year = now()->year;
        $code = $product->system_code ?: strtoupper(substr($product->form ?? 'GEN', 0, 3));

        $count = StockBatch::where('product_id', $product->id)
            ->whereYear('created_at', $year)
            ->count();

        $nextNumber = str_pad($count + 1, 2, '0', STR_PAD_LEFT);
        $suggested = "SP-{$year}-{$code}-{$nextNumber}";

        return response()->json(['suggested_batch_no' => $suggested]);
    }

    // Resolves a scanned unit-label barcode (e.g. "SP-2026-TAB-07-0001")
    // to the product it belongs to, using the batch_no only — the serial
    // suffix identifies which physical unit printed it, but for point-of-
    // sale purposes here we only need the product, so any unit from the
    // same batch (or the same one scanned more than once) resolves the
    // same way. Falls back to treating the whole code as the batch_no if
    // it doesn't have a serial suffix.
    public function lookupByBarcode(Request $request)
    {
        $validated = $request->validate(['code' => 'required|string']);
        $code = trim($validated['code']);

        $batchNo = preg_match('/^(.+)-(\d{4})$/', $code, $matches)
            ? $matches[1]
            : $code;

        $batch = StockBatch::where('batch_no', $batchNo)->first();

        if (!$batch) {
            return response()->json(['message' => 'No batch found for this barcode'], 404);
        }

        return response()->json([
            'product' => $batch->product,
            'batch' => $batch,
        ]);
    }

    // Marks a batch's barcodes as printed so the app doesn't show the print
    // button as "unprinted" again after a refresh/restart.
    public function markPrinted($id)
    {
        $batch = StockBatch::findOrFail($id);
        $batch->update(['printed' => true]);

        return response()->json($batch->load('product'));
    }
}
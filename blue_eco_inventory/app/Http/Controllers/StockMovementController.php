<?php

namespace App\Http\Controllers;

use App\Models\StockBatch;
use App\Models\StockMovement;
use Illuminate\Http\Request;

class StockMovementController extends Controller
{
    public function index()
    {
        return StockMovement::with('stockBatch.product')->latest('moved_at')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_batch_id' => 'required|exists:stock_batches,id',
            'quantity' => 'required|integer|min:1',
            'destination' => 'required|string|max:150',
            'moved_at' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $batch = StockBatch::findOrFail($validated['stock_batch_id']);

        // How much of this batch is still on-site (not already out on
        // another unreturned trip) — can't send out more than that.
        $alreadyOut = StockMovement::where('stock_batch_id', $batch->id)
            ->whereNull('returned_at')
            ->sum('quantity');

        $available = $batch->quantity - $alreadyOut;

        if ($validated['quantity'] > $available) {
            return response()->json([
                'message' => "Only {$available} unit(s) of this batch are currently available to move.",
            ], 422);
        }

        $movement = StockMovement::create($validated);

        return response()->json($movement->load('stockBatch.product'), 201);
    }

    // Marks stock as brought back (or fully accounted for) from the trip.
    public function markReturned($id)
    {
        $movement = StockMovement::findOrFail($id);
        $movement->update(['returned_at' => now()]);

        return response()->json($movement->load('stockBatch.product'));
    }

    public function destroy($id)
    {
        $movement = StockMovement::findOrFail($id);
        $movement->delete();

        return response()->json(['message' => 'Stock movement deleted']);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockMovementController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    // Paginated (default 20/page). Pass ?per_page= to change page size,
    // or ?all=1 for every row unpaginated.
    public function index(Request $request)
    {
        $query = StockMovement::with(['stockBatch.product', 'destinationStockBatch'])
            ->latest('moved_at');

        if ($request->boolean('all')) {
            return $query->get();
        }

        $perPage = (int) $request->input('per_page', 20);
        return $query->paginate($perPage);
    }

    // Literally moves stock between warehouses: the origin batch's
    // quantity shrinks (and is deleted if fully emptied out, same as a
    // sale would), and a new StockBatch row is created at the destination
    // warehouse carrying the moved quantity — same product, same
    // batch_no, so it's still traceable as the same physical stock. This
    // is a real transfer, not a temporary "trip"; the destination row
    // shows up in every warehouse total/breakdown immediately.
    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_batch_id' => 'required|exists:stock_batches,id',
            'quantity' => 'required|integer|min:1',
            'destination' => 'required|string|max:150',
            'moved_at' => 'required|date',
            'photo' => 'nullable|image|max:5120',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $origin = StockBatch::lockForUpdate()->findOrFail($validated['stock_batch_id']);

            if ($validated['quantity'] > $origin->quantity) {
                return response()->json([
                    'message' => "Only {$origin->quantity} unit(s) of this batch are currently available to move.",
                ], 422);
            }

            if ($validated['destination'] === $origin->warehouse) {
                return response()->json([
                    'message' => 'Destination is the same as where this batch already is.',
                ], 422);
            }

            // Snapshot everything the Transfer Log needs to display this
            // movement correctly even if the origin row is fully emptied
            // and deleted below (or later, by a sale).
            $originId = $origin->id;
            $productId = $origin->product_id;
            $batchNo = $origin->batch_no;
            $originWarehouse = $origin->warehouse;
            $bestBefore = $origin->best_before;
            $printed = $origin->printed;

            // The moved units keep their existing barcode serials — carve
            // the tail end of the origin's current range off for the
            // destination row, rather than starting a fresh range (these
            // aren't new physical units, just relocated ones).
            $destinationSerialStart = $origin->serial_start + ($origin->quantity - $validated['quantity']);

            $origin->quantity -= $validated['quantity'];
            if ($origin->quantity <= 0) {
                $origin->delete();
                $originId = null;
            } else {
                $origin->save();
            }

            $destinationBatch = StockBatch::create([
                'product_id' => $productId,
                'batch_no' => $batchNo,
                'quantity' => $validated['quantity'],
                'warehouse' => $validated['destination'],
                'best_before' => $bestBefore,
                'serial_start' => $destinationSerialStart,
                // Same physical labels as the origin batch — if they were
                // already printed, this portion is too; it didn't get
                // reprinted just by being relocated.
                'printed' => $printed,
            ]);

            $photoPath = null;
            if ($request->hasFile('photo')) {
                $photoPath = $this->cloudinary->upload($request->file('photo'), 'stock-movements');
            }

            $movement = StockMovement::create([
                'stock_batch_id' => $originId,
                'batch_no' => $batchNo,
                'product_id' => $productId,
                'origin_warehouse' => $originWarehouse,
                'best_before' => $bestBefore,
                'printed' => $printed,
                'quantity' => $validated['quantity'],
                'destination' => $validated['destination'],
                'destination_stock_batch_id' => $destinationBatch->id,
                'moved_at' => $validated['moved_at'],
                'photo_path' => $photoPath,
                'notes' => $validated['notes'] ?? null,
            ]);

            return response()->json(
                $movement->load(['stockBatch.product', 'destinationStockBatch']),
                201
            );
        });
    }

    // Moves stock back from the destination warehouse to the batch's
    // original home warehouse — a full or partial reversal of store()
    // above. `quantity_returned` in the request is how much is coming back
    // *this time* (not the running total); omit it for a full return.
    public function markReturned(Request $request, $id)
    {
        $movement = StockMovement::lockForUpdate()->findOrFail($id);
        $remaining = $movement->quantity - $movement->quantity_returned;

        if ($remaining <= 0) {
            return response()->json([
                'message' => 'This movement has already been fully returned.',
            ], 422);
        }

        $validated = $request->validate([
            'quantity_returned' => "nullable|integer|min:1|max:{$remaining}",
        ]);

        $qty = $validated['quantity_returned'] ?? $remaining;

        return DB::transaction(function () use ($movement, $qty) {
            // Pull the returning amount out of wherever it currently sits.
            // The destination batch may already be gone (fully sold/moved
            // on elsewhere) — in that case there's simply nothing left
            // there to physically pull back, so we just skip that half and
            // still credit the origin (matching how a sale can already
            // leave stock_batches short of stock_quantity elsewhere in
            // this app; StockService::deduct logs the same kind of gap).
            $destinationBatch = $movement->destination_stock_batch_id
                ? StockBatch::lockForUpdate()->find($movement->destination_stock_batch_id)
                : null;

            if ($destinationBatch) {
                if ($destinationBatch->quantity <= $qty) {
                    $destinationBatch->delete();
                } else {
                    $destinationBatch->decrement('quantity', $qty);
                }
            } else {
                logger()->warning(
                    "StockMovement #{$movement->id}: tried to return {$qty} unit(s) but its "
                    . 'destination batch no longer exists (already fully moved on or sold).'
                );
            }

            // ...and put it back at the batch's original home warehouse.
            // Reuse the origin row if it's still around; otherwise recreate
            // it from the movement's own snapshot (it was fully moved out
            // and deleted — see store() above).
            $originBatch = $movement->stock_batch_id
                ? StockBatch::lockForUpdate()->find($movement->stock_batch_id)
                : null;

            if ($originBatch) {
                $originBatch->increment('quantity', $qty);
            } else {
                $originBatch = StockBatch::create([
                    'product_id' => $movement->product_id,
                    'batch_no' => $movement->batch_no,
                    'quantity' => $qty,
                    'warehouse' => $movement->origin_warehouse,
                    'best_before' => $movement->best_before,
                    // The exact original serial range is lost once the
                    // origin row is fully depleted and deleted — this is a
                    // best-effort restart, not a precise reconstruction.
                    'serial_start' => 1,
                    'printed' => $movement->printed,
                ]);
                $movement->stock_batch_id = $originBatch->id;
            }

            $movement->quantity_returned += $qty;
            if ($movement->quantity_returned >= $movement->quantity) {
                $movement->returned_at = now();
            }
            $movement->save();

            return response()->json($movement->fresh()->load(['stockBatch.product', 'destinationStockBatch']));
        });
    }

    public function destroy($id)
    {
        $movement = StockMovement::findOrFail($id);
        $movement->delete();

        return response()->json(['message' => 'Stock movement deleted']);
    }
}

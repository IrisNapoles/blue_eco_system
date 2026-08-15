<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ForecastController extends Controller
{
    // GET /admin/reports/sales-forecast?periods=14&history_days=180
    //
    // Pulls daily total-sales history from the `sales` table, sends it to
    // the Python/Prophet microservice, and returns the predicted sales
    // for the next N days. This never talks to Prophet on every page
    // load from the frontend "for free" — it's a deliberate admin-only
    // report endpoint, same as the other /admin/reports/* routes.
    //
    // `periods`      — how many days ahead to forecast (default 14, max 90)
    // `history_days` — how far back to pull real sales history from
    //                  (default 180 days). More history = better forecast,
    //                  but there's no point sending years of data for a
    //                  short-range forecast.
    public function salesForecast(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'periods' => 'nullable|integer|min:1|max:90',
            'history_days' => 'nullable|integer|min:7|max:730',
        ]);

        $periods = $validated['periods'] ?? 14;
        $historyDays = $validated['history_days'] ?? 180;

        $history = $this->dailySalesHistory($historyDays);

        if (count($history) < 2) {
            return response()->json([
                'message' => 'Not enough sales history yet to generate a forecast. '
                    . 'At least 2 days with recorded sales are required.',
                'history_points_available' => count($history),
            ], 422);
        }

        $forecast = $this->callProphetService('/forecast/overall', [
            'history' => $history,
            'periods' => $periods,
        ]);

        if ($forecast === null) {
            return response()->json([
                'message' => 'Forecasting service is currently unavailable. Please try again shortly.',
            ], 502);
        }

        return response()->json($forecast);
    }

    // GET /admin/reports/product-forecast/{productId}?periods=14&history_days=180
    //
    // Same idea as salesForecast(), but scoped to units sold for a single
    // product (drawn from `sale_items`) instead of overall revenue.
    public function productForecast(Request $request, int $productId): JsonResponse
    {
        $validated = $request->validate([
            'periods' => 'nullable|integer|min:1|max:90',
            'history_days' => 'nullable|integer|min:7|max:730',
        ]);

        $periods = $validated['periods'] ?? 14;
        $historyDays = $validated['history_days'] ?? 180;

        $product = DB::table('products')->where('id', $productId)->first();

        if (!$product) {
            return response()->json(['message' => 'Product not found.'], 404);
        }

        $history = $this->dailyProductUnitsHistory($productId, $historyDays);

        if (count($history) < 2) {
            return response()->json([
                'message' => 'Not enough sales history yet for this product to generate a forecast.',
                'history_points_available' => count($history),
            ], 422);
        }

        $forecast = $this->callProphetService('/forecast/product', [
            'history' => $history,
            'periods' => $periods,
            'product_id' => $productId,
            'product_name' => $product->name,
        ]);

        if ($forecast === null) {
            return response()->json([
                'message' => 'Forecasting service is currently unavailable. Please try again shortly.',
            ], 502);
        }

        return response()->json($forecast);
    }

    // Daily total-sales revenue for the last N days, formatted as
    // {date, value} pairs — the exact shape the Prophet service expects.
    // Days with zero sales are included as 0 so Prophet sees a continuous
    // daily series rather than gaps.
    private function dailySalesHistory(int $days): array
    {
        $rows = Sale::query()
            ->select(
                DB::raw('DATE(created_at) as sale_date'),
                DB::raw('SUM(total_amount) as total')
            )
            ->where('created_at', '>=', now()->subDays($days)->startOfDay())
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get()
            ->keyBy('sale_date');

        return $this->fillDailyGaps($rows, $days);
    }

    // Same as above but counts units sold (from sale_items) for one product.
    private function dailyProductUnitsHistory(int $productId, int $days): array
    {
        $rows = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sale_items.product_id', $productId)
            ->select(
                DB::raw('DATE(sales.created_at) as sale_date'),
                DB::raw('SUM(sale_items.quantity) as total')
            )
            ->where('sales.created_at', '>=', now()->subDays($days)->startOfDay())
            ->groupBy('sale_date')
            ->orderBy('sale_date')
            ->get()
            ->keyBy('sale_date');

        return $this->fillDailyGaps($rows, $days);
    }

    // Walks every calendar day in the window (oldest -> today) and fills
    // in 0 for any day with no matching row, so Prophet gets a clean,
    // gap-free daily series instead of skipped dates.
    private function fillDailyGaps($rowsKeyedByDate, int $days): array
    {
        $history = [];
        $start = now()->subDays($days)->startOfDay();
        $end = now()->startOfDay();

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $key = $date->toDateString();
            $value = $rowsKeyedByDate->has($key)
                ? (float) $rowsKeyedByDate->get($key)->total
                : 0.0;

            $history[] = [
                'date' => $key,
                'value' => round($value, 2),
            ];
        }

        return $history;
    }

    // Thin wrapper around the HTTP call to the Prophet microservice.
    // Returns the decoded JSON body on success, or null on any failure
    // (network error, non-2xx response, timeout) so callers can turn
    // that into a clean 502 instead of a raw exception.
    private function callProphetService(string $path, array $payload): ?array
    {
        $baseUrl = config('services.prophet.url');

        if (empty($baseUrl)) {
            Log::error('PROPHET_SERVICE_URL is not configured.');
            return null;
        }

        try {
            $response = Http::timeout(15)
                ->acceptJson()
                ->post(rtrim($baseUrl, '/') . $path, $payload);

            if ($response->failed()) {
                Log::warning('Prophet service returned an error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return null;
            }

            return $response->json();
        } catch (\Throwable $e) {
            Log::error('Failed to reach Prophet service: ' . $e->getMessage());
            return null;
        }
    }
}
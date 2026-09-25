<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\WasteLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    // GET /admin/reports/sales-vs-waste?from=YYYY-MM-DD&to=YYYY-MM-DD
    //
    // Side-by-side summary of how much revenue came in (Sales — walk-in
    // sales + shipped distributor orders) versus how much stock value was
    // lost to damage/spoilage (Waste). "from"/"to" are optional; omit both
    // for an all-time summary. Pass the first/last day of the current
    // month from the app to get a "kita this month, net of damage" figure.
    public function salesVsWaste(Request $request)
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
        ]);

        $summary = $this->periodSummary($validated['from'] ?? null, $validated['to'] ?? null);

        return response()->json($summary);
    }

    // GET /admin/reports/monthly-trend?months=6
    //
    // Sales vs waste vs net, one row per month, oldest to newest — for
    // plotting a trend chart on the Admin Dashboard. Defaults to the last
    // 6 months including the current (partial) month.
    public function monthlyTrend(Request $request)
    {
        $validated = $request->validate([
            'months' => 'nullable|integer|min:1|max:24',
        ]);

        $months = $validated['months'] ?? 6;
        $rows = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = Carbon::now()->startOfMonth()->subMonths($i);
            $monthEnd = (clone $monthStart)->endOfMonth();

            $summary = $this->periodSummary(
                $monthStart->toDateString(),
                $monthEnd->toDateString()
            );

            $rows[] = [
                'month' => $monthStart->format('Y-m'),
                'label' => $monthStart->format('M Y'),
                'sales_total' => $summary['sales']['total_amount'],
                'waste_value' => $summary['waste']['total_value'],
                'net_amount' => $summary['net_amount'],
            ];
        }

        return response()->json($rows);
    }

    // GET /admin/reports/top-products?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=5
    //
    // Best-selling products by units sold, drawn from `sale_items` — which
    // now covers BOTH walk-in sales and shipped distributor orders (see
    // OrderController::updateStatus), so this is a true combined ranking
    // across both channels, not just one.
    public function topProducts(Request $request)
    {
        $validated = $request->validate([
            'from' => 'nullable|date',
            'to' => 'nullable|date',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        $query = SaleItem::query()
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                'products.weight as product_weight',
                DB::raw('SUM(sale_items.quantity) as units_sold'),
                DB::raw('SUM(sale_items.quantity * sale_items.price) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.weight')
            ->orderByDesc('units_sold');

        if (!empty($validated['from'])) {
            $query->whereDate('sales.created_at', '>=', $validated['from']);
        }
        if (!empty($validated['to'])) {
            $query->whereDate('sales.created_at', '<=', $validated['to']);
        }

        $limit = $validated['limit'] ?? 5;

        $topProducts = $query->limit($limit)->get()->map(function ($row) {
            return [
                'product_id' => $row->product_id,
                'product_name' => $row->product_name,
                'product_weight' => $row->product_weight,
                'units_sold' => (int) $row->units_sold,
                'revenue' => round((float) $row->revenue, 2),
            ];
        });

        return response()->json($topProducts);
    }

    // Shared calculation used by both salesVsWaste() and monthlyTrend(),
    // so the two endpoints can never drift out of sync with each other.
    private function periodSummary(?string $from, ?string $to): array
    {
        $salesQuery = Sale::query();
        // Rejected waste logs turned out not to be real waste, so they're
        // excluded — everything else ("Logged for Review" and "Confirmed")
        // already reduced stock and represents a real loss. No eager load
        // here: this is reused below purely as a query builder for a SQL
        // join+groupBy aggregate, not to hydrate WasteLog models.
        //
        // Columns are qualified with "waste_logs." because this query gets
        // joined against products below — and products has its own
        // created_at column too, so an unqualified whereDate('created_at')
        // is ambiguous to Postgres once that join is added (this caused a
        // 500 on every request until it was qualified here).
        $wasteQuery = WasteLog::query()->where('waste_logs.status', '!=', 'Rejected');

        if (!empty($from)) {
            $salesQuery->whereDate('created_at', '>=', $from);
            $wasteQuery->whereDate('waste_logs.created_at', '>=', $from);
        }
        if (!empty($to)) {
            $salesQuery->whereDate('created_at', '<=', $to);
            $wasteQuery->whereDate('waste_logs.created_at', '<=', $to);
        }

        $totalSales = (float) $salesQuery->sum('total_amount');

        // Aggregate waste totals and the per-product breakdown directly in
        // SQL (join + groupBy) instead of pulling every waste_logs row (with
        // its product relation) into PHP just to sum/group them there. This
        // keeps the query fast as waste_logs grows, and matches the same
        // join+groupBy pattern already used in topProducts() above.
        $wasteByProductQuery = clone $wasteQuery;
        $wasteByProduct = $wasteByProductQuery
            ->join('products', 'waste_logs.product_id', '=', 'products.id')
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                DB::raw('SUM(waste_logs.quantity) as units_wasted'),
                DB::raw('SUM(waste_logs.quantity * products.price) as value_wasted')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('value_wasted')
            ->get()
            ->map(fn ($row) => [
                'product_id' => $row->product_id,
                'product_name' => $row->product_name,
                'units_wasted' => (int) $row->units_wasted,
                'value_wasted' => round((float) $row->value_wasted, 2),
            ])
            ->values();

        $totalWasteUnits = (int) $wasteByProduct->sum('units_wasted');
        $totalWasteValue = (float) $wasteByProduct->sum('value_wasted');

        return [
            'from' => $from,
            'to' => $to,
            'sales' => [
                'total_amount' => round($totalSales, 2),
            ],
            'waste' => [
                'total_units' => $totalWasteUnits,
                'total_value' => round($totalWasteValue, 2),
                'by_product' => $wasteByProduct,
            ],
            // Rough net figure: revenue earned minus value lost to waste.
            'net_amount' => round($totalSales - $totalWasteValue, 2),
        ];
    }
}
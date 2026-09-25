<?php

namespace App\Http\Controllers;

use App\Models\BusinessSetting;
use App\Models\OperatingExpenseItem;
use App\Models\Product;
use App\Models\ProductCostHistory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BusinessSettingsController extends Controller
{
    // Admin only: every product with its currently-effective cost price,
    // for the "Product Costs" section of Settings. Cost is never edited
    // in place (see ProductCostHistory) so this always reflects "as of
    // today" — past Net Profit reports are unaffected by changing it here.
    public function productCosts()
    {
        $products = Product::with('costHistory')
            ->orderBy('name')
            ->get()
            ->map(function ($product) {
                $latest = $product->costHistory->first();
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'price' => (float) $product->price,
                    'cost_price' => $latest ? (float) $latest->cost_price : null,
                    'cost_effective_from' => $latest?->effective_from?->toDateString(),
                ];
            });

        return response()->json($products);
    }

    // Admin only: quick setup for every product at once — set each
    // product's cost as a flat percentage of its own selling price (e.g.
    // 60% of price), instead of entering every product one by one. By
    // default this only fills in products that have never had a cost set
    // (skip_existing), so it won't clobber costs you've already
    // fine-tuned individually — pass skip_existing=false to override all
    // of them at the given rate instead.
    public function bulkUpdateProductCosts(Request $request)
    {
        $validated = $request->validate([
            'percent_of_price' => 'required|numeric|min:0|max:1000',
            'effective_from' => 'nullable|date',
            'skip_existing' => 'nullable|boolean',
        ]);

        $skipExisting = $validated['skip_existing'] ?? true;
        $effectiveFrom = $validated['effective_from'] ?? now()->toDateString();

        $products = Product::with('costHistory')->get();
        $updated = 0;
        $skipped = 0;

        foreach ($products as $product) {
            if ($skipExisting && $product->costHistory->isNotEmpty()) {
                $skipped++;
                continue;
            }

            ProductCostHistory::create([
                'product_id' => $product->id,
                'cost_price' => round($product->price * ($validated['percent_of_price'] / 100), 2),
                'effective_from' => $effectiveFrom,
                'created_by' => $request->user()->id,
            ]);
            $updated++;
        }

        return response()->json([
            'message' => "Set cost for {$updated} product(s)" . ($skipped ? ", skipped {$skipped} that already had a cost" : '.'),
            'updated' => $updated,
            'skipped' => $skipped,
        ]);
    }

    // Admin only: record a new cost for a product, effective from a given
    // date (defaults to today). Inserts a new row rather than overwriting
    // the old one, so historical reports keep using whatever was true then.
    public function updateProductCost(Request $request, Product $product)
    {
        $validated = $request->validate([
            'cost_price' => 'required|numeric|min:0',
            'effective_from' => 'nullable|date',
        ]);

        $history = ProductCostHistory::create([
            'product_id' => $product->id,
            'cost_price' => $validated['cost_price'],
            'effective_from' => $validated['effective_from'] ?? now()->toDateString(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Product cost updated',
            'cost_price' => (float) $history->cost_price,
            'effective_from' => $history->effective_from->toDateString(),
        ]);
    }

    // Admin only: the current amount for every preset category (0 if never
    // set) plus the tax rate, for the "Operating Expenses" section of
    // Settings. Custom 'other' entries are listed individually since there
    // can be more than one.
    public function operatingExpenses()
    {
        $latestPerCategory = OperatingExpenseItem::query()
            ->where('category', '!=', 'other')
            ->orderByDesc('effective_from')
            ->get()
            ->groupBy('category')
            ->map(fn ($items) => $items->first());

        $presets = collect(OperatingExpenseItem::CATEGORIES)
            ->except(['other'])
            ->map(function ($displayLabel, $category) use ($latestPerCategory) {
                $latest = $latestPerCategory->get($category);
                return [
                    'category' => $category,
                    'label' => $displayLabel,
                    'monthly_amount' => $latest ? (float) $latest->monthly_amount : 0.0,
                    'effective_from' => $latest?->effective_from?->toDateString(),
                ];
            })
            ->values();

        // 'other' entries: one row per distinct custom label, each showing
        // only its own latest amount (a label can itself be re-priced
        // later the same versioned way as any preset category).
        $customItems = OperatingExpenseItem::query()
            ->where('category', 'other')
            ->orderByDesc('effective_from')
            ->get()
            ->groupBy('label')
            ->map(function ($items) {
                $latest = $items->first();
                return [
                    'category' => 'other',
                    'label' => $latest->label,
                    'monthly_amount' => (float) $latest->monthly_amount,
                    'effective_from' => $latest->effective_from->toDateString(),
                ];
            })
            ->values();

        return response()->json([
            'items' => $presets->concat($customItems)->values(),
            'tax_rate_percent' => (float) BusinessSetting::current()->tax_rate_percent,
        ]);
    }

    // Admin only: record a new amount for a category (or a custom 'other'
    // line item), effective from a given date (defaults to today).
    public function updateOperatingExpense(Request $request)
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in(array_keys(OperatingExpenseItem::CATEGORIES))],
            'label' => 'required_if:category,other|nullable|string|max:255',
            'monthly_amount' => 'required|numeric|min:0',
            'effective_from' => 'nullable|date',
        ]);

        $item = OperatingExpenseItem::create([
            'category' => $validated['category'],
            'label' => $validated['category'] === 'other' ? $validated['label'] : null,
            'monthly_amount' => $validated['monthly_amount'],
            'effective_from' => $validated['effective_from'] ?? now()->toDateString(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Operating expense updated',
            'category' => $item->category,
            'label' => $item->label,
            'monthly_amount' => (float) $item->monthly_amount,
            'effective_from' => $item->effective_from->toDateString(),
        ]);
    }

    // Admin only: update the tax rate used in Net Profit (percentage of
    // gross sales). Not date-versioned — always applied at today's rate,
    // since tax rates change far less often than product costs and other
    // operating expenses. Default is 3%, the PH Percentage Tax rate for a
    // non-VAT-registered business; set to 12% if VAT-registered instead.
    public function updateTaxRate(Request $request)
    {
        $validated = $request->validate([
            'tax_rate_percent' => 'required|numeric|min:0|max:100',
        ]);

        $setting = BusinessSetting::current();
        $setting->tax_rate_percent = $validated['tax_rate_percent'];
        $setting->save();

        return response()->json([
            'message' => 'Tax rate updated',
            'tax_rate_percent' => (float) $setting->tax_rate_percent,
        ]);
    }
}

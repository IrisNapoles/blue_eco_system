<?php

namespace App\Http\Controllers;

use App\Models\ShippingRate;
use Illuminate\Http\Request;

class ShippingRateController extends Controller
{
    // GET /admin/shipping-rates
    public function index()
    {
        return ShippingRate::orderByRaw("FIELD(tier, 'NCR', 'Luzon', 'Visayas', 'Mindanao')")->get();
    }

    // PUT /admin/shipping-rates/{id}
    public function update(Request $request, $id)
    {
        $rate = ShippingRate::findOrFail($id);

        $validated = $request->validate([
            'fee' => 'required|numeric|min:0',
            'per_kg_rate' => 'required|numeric|min:0',
            'min_days' => 'required|integer|min:1',
            'max_days' => 'required|integer|min:1',
        ]);

        $rate->update($validated);

        return response()->json($rate);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Address;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    // Max saved addresses per distributor (mirrors the Flutter-side limit).
    private const MAX_ADDRESSES = 3;

    public function index(Request $request)
    {
        $user = $request->user();
        $addresses = Address::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->latest()
            ->get();

        if ($addresses->isEmpty()) {
            $hasProfileAddress = $user->street_no && $user->city;

            if (!$hasProfileAddress) {
                return response()->json([]);
            }

            return response()->json([[
                'id' => 0,
                'user_id' => $user->id,
                'recipient_name' => $user->name,
                'contact_number' => $user->contact_number,
                'street_no' => $user->street_no,
                'barangay' => $user->barangay,
                'city' => $user->city,
                'state_province' => $user->state_province,
                'region' => $user->region,
                'is_default' => true,
                'combined_address' => implode(', ', array_filter([
                    $user->street_no,
                    $user->barangay,
                    $user->city,
                    $user->state_province,
                    $user->region,
                ])),
            ]]);
        }

        return response()->json($addresses);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $existingCount = Address::where('user_id', $user->id)->count();
        if ($existingCount >= self::MAX_ADDRESSES) {
            abort(422, 'You can only save up to ' . self::MAX_ADDRESSES . ' addresses.');
        }

        $validated = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'contact_number' => 'required|string|max:30',
            'street_no' => 'required|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'city' => 'required|string|max:255',
            'state_province' => 'required|string|max:255',
            'region' => 'required|string|max:255',
            'is_default' => 'boolean',
        ]);

        $address = DB::transaction(function () use ($validated, $user) {
            if (!empty($validated['is_default'])) {
                Address::where('user_id', $user->id)->update(['is_default' => false]);
            }

            return Address::create([...$validated, 'user_id' => $user->id]);
        });

        return response()->json($address, 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'recipient_name' => 'required|string|max:255',
            'contact_number' => 'required|string|max:30',
            'street_no' => 'required|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'city' => 'required|string|max:255',
            'state_province' => 'required|string|max:255',
            'region' => 'required|string|max:255',
            'is_default' => 'boolean',
        ]);

        DB::transaction(function () use ($validated, $user, $address) {
            if (!empty($validated['is_default'])) {
                Address::where('user_id', $user->id)
                    ->where('id', '!=', $address->id)
                    ->update(['is_default' => false]);
            }

            $address->update($validated);
        });

        return response()->json($address);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::where('user_id', $user->id)->findOrFail($id);
        $address->delete();

        return response()->json(['message' => 'Address removed']);
    }

    // Marks one address as the distributor's default and unsets it on
    // every other address they own.
    public function setDefault(Request $request, $id)
    {
        $user = $request->user();
        $address = Address::where('user_id', $user->id)->findOrFail($id);

        DB::transaction(function () use ($user, $address) {
            Address::where('user_id', $user->id)
                ->where('id', '!=', $address->id)
                ->update(['is_default' => false]);

            $address->update(['is_default' => true]);
        });

        return response()->json($address);
    }
}
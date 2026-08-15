<?php

namespace App\Http\Controllers;

use App\Models\PaymentSetting;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;

class PaymentSettingController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    // Any logged-in user can view it (needed so distributors see GCash/Bank details)
    public function show()
    {
        $setting = PaymentSetting::current();
        return response()->json([
            'gcash_qr_url' => $setting->gcash_qr_path, // already a full Cloudinary URL
            'gcash_account_name' => $setting->gcash_account_name,
            'gcash_account_number' => $setting->gcash_account_number,
            'bank_name' => $setting->bank_name,
            'bank_account_name' => $setting->bank_account_name,
            'bank_account_number' => $setting->bank_account_number,
            'shop_city' => $setting->shop_city,
            'shop_barangay' => $setting->shop_barangay,
            'shop_province' => $setting->shop_province,
            'shop_region' => $setting->shop_region,
        ]);
    }

    // Admin only: upload/replace the QR code image and edit account details
    public function update(Request $request)
    {
        $validated = $request->validate([
            'gcash_account_name' => 'nullable|string|max:255',
            'gcash_account_number' => 'nullable|string|max:50',
            'qr_image' => 'nullable|image|max:5120',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:50',
            // The shop's single origin location — used by
            // DeliveryEstimateService to compute shipping fee/ETA for
            // every order based on distance from here.
            'shop_city' => 'nullable|string|max:255',
            'shop_barangay' => 'nullable|string|max:255',
            'shop_province' => 'nullable|string|max:255',
            'shop_region' => 'nullable|string|max:255',
        ]);

        $setting = PaymentSetting::current();

        if ($request->hasFile('qr_image')) {
            $path = $this->cloudinary->upload($request->file('qr_image'), 'payment_qr');
            $setting->gcash_qr_path = $path;
        }

        $setting->gcash_account_name = $validated['gcash_account_name'] ?? $setting->gcash_account_name;
        $setting->gcash_account_number = $validated['gcash_account_number'] ?? $setting->gcash_account_number;
        $setting->bank_name = $validated['bank_name'] ?? $setting->bank_name;
        $setting->bank_account_name = $validated['bank_account_name'] ?? $setting->bank_account_name;
        $setting->bank_account_number = $validated['bank_account_number'] ?? $setting->bank_account_number;
        $setting->shop_city = $validated['shop_city'] ?? $setting->shop_city;
        $setting->shop_barangay = $validated['shop_barangay'] ?? $setting->shop_barangay;
        $setting->shop_province = $validated['shop_province'] ?? $setting->shop_province;
        $setting->shop_region = $validated['shop_region'] ?? $setting->shop_region;
        $setting->save();

        return response()->json(['message' => 'Payment settings updated', 'setting' => $setting]);
    }
}
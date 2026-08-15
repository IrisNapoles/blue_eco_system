<?php

namespace App\Services;

use App\Models\PaymentSetting;
use Carbon\Carbon;

class DeliveryEstimateService
{
    // Weight-based rates per destination zone, modeled after typical J&T
    // Express seller rates for a Metro Manila-based shop. `base_fee`
    // covers the first kilogram; `per_kg` is added for every additional
    // kilogram (or fraction of a kilogram) beyond that.
    private const ZONE_RATES = [
        'NCR' => [
            'base_fee' => 70,
            'per_kg' => 15,
            'min_days' => 1,
            'max_days' => 2,
        ],
        'Luzon' => [
            'base_fee' => 85,
            'per_kg' => 18,
            'min_days' => 2,
            'max_days' => 4,
        ],
        'Visayas' => [
            'base_fee' => 92,
            'per_kg' => 20,
            'min_days' => 3,
            'max_days' => 6,
        ],
        'Mindanao' => [
            'base_fee' => 96,
            'per_kg' => 22,
            'min_days' => 5,
            'max_days' => 10,
        ],
    ];

    // Philippine region groupings by destination zone. NCR is kept
    // separate from the rest of Luzon since J&T (and most couriers)
    // price NCR deliveries lower — shop is assumed to be Metro
    // Manila-based, matching standard seller shipping calculators.
    private const ZONE_REGIONS = [
        'NCR' => ['NCR', 'National Capital Region'],
        'Luzon' => [
            'CALABARZON', 'Central Luzon', 'Ilocos Region', 'Cagayan Valley',
            'Bicol Region', 'MIMAROPA', 'Cordillera Administrative Region', 'CAR',
            'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region IV-B', 'Region V',
        ],
        'Visayas' => [
            'Western Visayas', 'Central Visayas', 'Eastern Visayas',
            'Region VI', 'Region VII', 'Region VIII',
        ],
        'Mindanao' => [
            'Zamboanga Peninsula', 'Northern Mindanao', 'Davao Region',
            'SOCCSKSARGEN', 'CARAGA', 'Bangsamoro Autonomous Region in Muslim Mindanao', 'BARMM',
            'Region IX', 'Region X', 'Region XI', 'Region XII', 'Region XIII',
        ],
    ];

    /**
     * Returns ['zone' => string, 'fee' => float, 'weight_kg' => float,
     * 'min_date' => Carbon, 'max_date' => Carbon].
     *
     * @param string $deliveryRegion e.g. $validated['delivery_region'] or $order->delivery_region
     * @param float $weightKg total weight of the order in kilograms
     * @param Carbon|null $referenceDate defaults to now()
     */
    public function estimate(string $deliveryRegion, float $weightKg, ?Carbon $referenceDate = null): array
    {
        $zone = $this->determineZone($deliveryRegion);
        $rate = self::ZONE_RATES[$zone];
        $reference = $referenceDate ?? now();

        // First kilogram is covered by base_fee; every additional kilogram
        // (rounding up, since couriers charge per whole/partial kg) adds
        // per_kg on top.
        $extraKg = max(0, $weightKg - 1);
        $extraKgRounded = (int) ceil($extraKg);
        $fee = $rate['base_fee'] + ($extraKgRounded * $rate['per_kg']);

        return [
            'zone' => $zone,
            'fee' => (float) $fee,
            'weight_kg' => round($weightKg, 2),
            'min_date' => $reference->copy()->addDays($rate['min_days']),
            'max_date' => $reference->copy()->addDays($rate['max_days']),
        ];
    }

    private function determineZone(string $deliveryRegion): string
    {
        foreach (self::ZONE_REGIONS as $zone => $regions) {
            foreach ($regions as $candidate) {
                if ($this->sameText($candidate, $deliveryRegion)) {
                    return $zone;
                }
            }
        }

        // Unmatched/unrecognized region text — default to the Luzon rate
        // as a safe middle-ground rather than failing the request.
        return 'Luzon';
    }

    private function sameText(?string $a, ?string $b): bool
    {
        if (!$a || !$b) {
            return false;
        }

        return strcasecmp(trim($a), trim($b)) === 0;
    }
}

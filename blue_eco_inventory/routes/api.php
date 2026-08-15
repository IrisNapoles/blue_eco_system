<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\WasteLogController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\StockBatchController;
use App\Http\Controllers\PaymentSettingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AddressController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SupplyController;
use App\Http\Controllers\ForecastController;
use App\Http\Controllers\ShippingRateController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);


Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Any logged-in user can view and manage their own in-app notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::put('/notifications/read-all', [NotificationController::class, 'markAllRead']);

    // Any logged-in user (admin, staff, distributor) can view products andd the Top Selling Products
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/top-sellers', [ProductController::class, 'topSellers']);
    Route::get('/products/{id}', [ProductController::class, 'show']);

    // Any logged-in user can VIEW stock batches (needed for Staff's near-expiry section)
    Route::get('/admin/stock-batches', [StockBatchController::class, 'index']);

    // Any logged-in user can view the GCash QR / Bank details
    Route::get('/payment-settings', [PaymentSettingController::class, 'show']);

    // Any logged-in user (admin, staff) can view supplies
    Route::get('/supplies', [SupplyController::class, 'index']);
    Route::get('/supplies/{id}', [SupplyController::class, 'show']);

    Route::middleware('role:admin')->group(function () {
        Route::post('/admin/staff', [AdminController::class, 'createStaff']);
        Route::get('/admin/distributors/pending', [AdminController::class, 'pendingDistributors']);
        Route::post('/admin/distributors/{id}/approve', [AdminController::class, 'approveDistributor']);
        Route::post('/admin/distributors/{id}/decline', [AdminController::class, 'declineDistributor']);
        Route::get('/admin/users', [AdminController::class, 'allUsers']);
        Route::put('/admin/users/{id}', [AdminController::class, 'updateUser']);
        Route::put('/admin/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);

        // Only Admin can manage products
        Route::post('/products', [ProductController::class, 'store']);
        Route::put('/products/{id}', [ProductController::class, 'update']);
        Route::delete('/products/{id}', [ProductController::class, 'destroy']);

        // Only Admin can manage supplies
        Route::post('/supplies', [SupplyController::class, 'store']);
        Route::put('/supplies/{id}', [SupplyController::class, 'update']);
        Route::delete('/supplies/{id}', [SupplyController::class, 'destroy']);

        // Only Admin can CREATE stock batches
        Route::post('/admin/stock-batches', [StockBatchController::class, 'store']);
        Route::get('/admin/stock-batches/next-batch-number', [StockBatchController::class, 'nextBatchNumber']);
        Route::patch('/admin/stock-batches/{id}/mark-printed', [StockBatchController::class, 'markPrinted']);

        // Admin order management
        Route::get('/admin/orders', [OrderController::class, 'adminIndex']);
        Route::put('/admin/orders/{id}/status', [OrderController::class, 'updateStatus']);
        Route::put('/admin/orders/{id}/verify-payment', [OrderController::class, 'verifyPayment']);
        Route::post('/admin/orders/{id}/packed-photo', [OrderController::class, 'uploadPackedPhoto']);

        // Admin waste log review
        Route::put('/admin/waste-log/{id}/status', [WasteLogController::class, 'updateStatus']);

        // Admin dashboard: sales revenue vs. waste value, side by side
        Route::get('/admin/reports/sales-vs-waste', [ReportController::class, 'salesVsWaste']);
        Route::get('/admin/reports/monthly-trend', [ReportController::class, 'monthlyTrend']);
        Route::get('/admin/reports/top-products', [ReportController::class, 'topProducts']);

        Route::get('/admin/reports/sales-forecast', [ForecastController::class, 'salesForecast']);
        Route::get('/admin/reports/product-forecast/{productId}', [ForecastController::class, 'productForecast']);
 
        // Admin manages the GCash QR code / Bank account details
        Route::post('/admin/payment-settings', [PaymentSettingController::class, 'update']);

        // Admin manages shipping rates
        Route::get('/admin/shipping-rates', [ShippingRateController::class, 'index']);
        Route::put('/admin/shipping-rates/{id}', [ShippingRateController::class, 'update']);
    });

    Route::get('/staff/waste-log', [WasteLogController::class, 'index']);
    Route::post('/staff/waste-log', [WasteLogController::class, 'store']);

    Route::get('/staff/sales', [SaleController::class, 'index']);
    Route::post('/staff/sales', [SaleController::class, 'store']);

    Route::get('/distributor/orders', [OrderController::class, 'index']);
    Route::post('/distributor/delivery-estimate', [OrderController::class, 'deliveryEstimate']);
    Route::post('/distributor/orders', [OrderController::class, 'store']);
    Route::post('/distributor/orders/{id}/proof-of-payment', [OrderController::class, 'uploadProof']);
    Route::put('/distributor/orders/{id}/delivery-address', [OrderController::class, 'updateDeliveryAddress']);
    Route::put('/distributor/orders/{id}/cancel', [OrderController::class, 'cancel']);
    Route::put('/distributor/orders/{id}/received', [OrderController::class, 'markReceived']);
    Route::put('/distributor/orders/{id}/payment-method', [OrderController::class, 'updatePaymentMethod']);

    // Distributor's saved delivery addresses
    Route::get('/distributor/addresses', [AddressController::class, 'index']);
    Route::post('/distributor/addresses', [AddressController::class, 'store']);
    Route::put('/distributor/addresses/{id}', [AddressController::class, 'update']);
    Route::delete('/distributor/addresses/{id}', [AddressController::class, 'destroy']);
    Route::put('/distributor/addresses/{id}/default', [AddressController::class, 'setDefault']);

    Route::get('/stock-batches/lookup', [StockBatchController::class, 'lookupByBarcode']);

});
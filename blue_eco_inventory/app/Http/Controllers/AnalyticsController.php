<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Order;
use App\Models\Product;
use App\Models\StockBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->get('period', '30days');
        
        // Date ranges
        $dateRange = $this->getDateRange($period);
        $previousRange = $this->getPreviousDateRange($period);

        // B2B Order Revenue Analytics (Distributor Orders Only)
        $currentRevenue = Order::whereBetween('created_at', $dateRange)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');
        
        $previousRevenue = Order::whereBetween('created_at', $previousRange)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');
        
        $revenueGrowth = $previousRevenue > 0 
            ? round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 1)
            : 0;

        // Order Analytics
        $currentOrders = Order::whereBetween('created_at', $dateRange)->count();
        $previousOrders = Order::whereBetween('created_at', $previousRange)->count();
        
        $orderGrowth = $previousOrders > 0
            ? round((($currentOrders - $previousOrders) / $previousOrders) * 100, 1)
            : 0;

        // Average Order Value
        $avgOrderValue = $currentOrders > 0 
            ? Order::whereBetween('created_at', $dateRange)->avg('total_amount')
            : 0;

        // Monthly Revenue Trend (last 12 months) - B2B Orders Only
        $monthlyRevenue = $this->getMonthlyRevenueTrend();

        // Top Products (from orders only)
        $topProducts = $this->getTopProducts($dateRange);

        // Orders by Payment Method
        $ordersByPaymentMethod = $this->getOrdersByPaymentMethod($dateRange);

        // Order Status Distribution
        $orderStatusDistribution = $this->getOrderStatusDistribution($dateRange);

        // Orders by Distributor
        $ordersByDistributor = $this->getOrdersByDistributor($dateRange);

        // Low Stock Alerts
        $lowStockProducts = Product::where('stock_quantity', '<', 100)
            ->where('stock_quantity', '>', 0)
            ->orderBy('stock_quantity')
            ->limit(10)
            ->get();

        // Near Expiry Batches
        $nearExpiryBatches = StockBatch::where('best_before', '<=', Carbon::now()->addDays(30))
            ->where('best_before', '>', Carbon::now())
            ->with('product')
            ->orderBy('best_before')
            ->limit(10)
            ->get();

        return view('admin.analytics.index', compact(
            'period',
            'currentRevenue',
            'revenueGrowth',
            'currentOrders',
            'orderGrowth',
            'avgOrderValue',
            'monthlyRevenue',
            'topProducts',
            'ordersByPaymentMethod',
            'orderStatusDistribution',
            'ordersByDistributor',
            'lowStockProducts',
            'nearExpiryBatches'
        ));
    }

    // GET /api/admin/analytics?period=30days
    //
    // Same data as the web dashboard (index() above), but returned as JSON
    // instead of a Blade view. This is what the mobile app should call so
    // it shows the exact same numbers as the web admin dashboard — since
    // both read straight from the database, any sale, order, or stock
    // change made from either the web app or the mobile app shows up here
    // immediately on the next request (no separate sync step needed).
    public function apiDashboard(Request $request)
    {
        $period = $request->get('period', '30days');

        $dateRange = $this->getDateRange($period);
        $previousRange = $this->getPreviousDateRange($period);

        $currentRevenue = Order::whereBetween('created_at', $dateRange)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        $previousRevenue = Order::whereBetween('created_at', $previousRange)
            ->where('status', '!=', 'cancelled')
            ->sum('total_amount');

        $revenueGrowth = $previousRevenue > 0
            ? round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 1)
            : 0;

        $currentOrders = Order::whereBetween('created_at', $dateRange)->count();
        $previousOrders = Order::whereBetween('created_at', $previousRange)->count();

        $orderGrowth = $previousOrders > 0
            ? round((($currentOrders - $previousOrders) / $previousOrders) * 100, 1)
            : 0;

        $avgOrderValue = $currentOrders > 0
            ? Order::whereBetween('created_at', $dateRange)->avg('total_amount')
            : 0;

        return response()->json([
            'period' => $period,
            'revenue' => [
                'current' => round((float) $currentRevenue, 2),
                'previous' => round((float) $previousRevenue, 2),
                'growth_percent' => $revenueGrowth,
            ],
            'orders' => [
                'current' => $currentOrders,
                'previous' => $previousOrders,
                'growth_percent' => $orderGrowth,
                'avg_order_value' => round((float) $avgOrderValue, 2),
            ],
            'monthly_revenue_trend' => $this->getMonthlyRevenueTrend(),
            'top_products' => $this->getTopProducts($dateRange),
            'orders_by_payment_method' => $this->getOrdersByPaymentMethod($dateRange),
            'order_status_distribution' => $this->getOrderStatusDistribution($dateRange),
            'orders_by_distributor' => $this->getOrdersByDistributor($dateRange),
            'low_stock_products' => Product::where('stock_quantity', '<', 100)
                ->where('stock_quantity', '>', 0)
                ->orderBy('stock_quantity')
                ->limit(10)
                ->get(),
            'near_expiry_batches' => StockBatch::where('best_before', '<=', Carbon::now()->addDays(30))
                ->where('best_before', '>', Carbon::now())
                ->with('product')
                ->orderBy('best_before')
                ->limit(10)
                ->get(),
        ]);
    }

    private function getDateRange($period)
    {
        switch ($period) {
            case '7days':
                return [Carbon::now()->subDays(7), Carbon::now()];
            case '30days':
                return [Carbon::now()->subDays(30), Carbon::now()];
            case '90days':
                return [Carbon::now()->subDays(90), Carbon::now()];
            case 'year':
                return [Carbon::now()->startOfYear(), Carbon::now()];
            default:
                return [Carbon::now()->subDays(30), Carbon::now()];
        }
    }

    private function getPreviousDateRange($period)
    {
        switch ($period) {
            case '7days':
                return [Carbon::now()->subDays(14), Carbon::now()->subDays(7)];
            case '30days':
                return [Carbon::now()->subDays(60), Carbon::now()->subDays(30)];
            case '90days':
                return [Carbon::now()->subDays(180), Carbon::now()->subDays(90)];
            case 'year':
                return [Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear()];
            default:
                return [Carbon::now()->subDays(60), Carbon::now()->subDays(30)];
        }
    }

    private function getMonthlyRevenueTrend()
    {
        $months = [];
        $ordersData = [];

        for ($i = 11; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $months[] = $date->format('M Y');

            $ordersRevenue = Order::whereYear('created_at', $date->year)
                ->whereMonth('created_at', $date->month)
                ->where('status', '!=', 'cancelled')
                ->sum('total_amount');

            $ordersData[] = $ordersRevenue;
        }

        return [
            'labels' => $months,
            'orders' => $ordersData,
        ];
    }

    private function getTopProducts($dateRange)
    {
        // Only from distributor orders
        $topProducts = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->whereBetween('orders.created_at', $dateRange)
            ->where('orders.status', '!=', 'cancelled')
            ->select(
                'products.id',
                'products.name',
                DB::raw('SUM(order_items.quantity) as total_quantity'),
                DB::raw('SUM(order_items.quantity * order_items.price) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_revenue')
            ->limit(10)
            ->get();

        return $topProducts;
    }

    private function getOrdersByPaymentMethod($dateRange)
    {
        $ordersByMethod = Order::whereBetween('created_at', $dateRange)
            ->where('status', '!=', 'cancelled')
            ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total_amount) as total'))
            ->groupBy('payment_method')
            ->get();

        return $ordersByMethod;
    }

    private function getOrdersByDistributor($dateRange)
    {
        $ordersByDistributor = DB::table('orders')
            ->join('users', 'orders.distributor_id', '=', 'users.id')
            ->whereBetween('orders.created_at', $dateRange)
            ->where('orders.status', '!=', 'cancelled')
            ->select(
                'users.name',
                DB::raw('COUNT(orders.id) as total_orders'),
                DB::raw('SUM(orders.total_amount) as total_spending')
            )
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_spending')
            ->limit(10)
            ->get();

        return $ordersByDistributor;
    }

    private function getOrderStatusDistribution($dateRange)
    {
        $distribution = Order::whereBetween('created_at', $dateRange)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        return $distribution;
    }

    public function ordersReport(Request $request)
    {
        $startDate = $request->get('start_date', Carbon::now()->subDays(30)->format('Y-m-d'));
        $endDate = $request->get('end_date', Carbon::now()->format('Y-m-d'));

        $orders = Order::with('items.product', 'distributor')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderByDesc('created_at')
            ->get();

        $totalOrders = $orders->sum('total_amount');
        $totalCount = $orders->count();

        return view('admin.analytics.orders-report', compact(
            'orders',
            'totalOrders',
            'totalCount',
            'startDate',
            'endDate'
        ));
    }

    public function getDemandForecast(Request $request)
    {
        $periods = $request->get('periods', 30);
        
        // Get historical order data (last 90 days) - Distributor orders only
        $historicalData = Order::select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(total_amount) as amount')
            )
            ->where('created_at', '>=', Carbon::now()->subDays(90))
            ->where('status', '!=', 'cancelled')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'amount' => $item->amount
                ];
            })
            ->toArray();

        // If insufficient data, return empty forecast
        if (count($historicalData) < 14) {
            return response()->json([
                'status' => 'insufficient_data',
                'message' => 'At least 14 days of historical order data required for forecasting',
                'forecast' => []
            ]);
        }

        // Call Python script
        $forecast = $this->callProphetScript($historicalData, $periods);

        return response()->json($forecast);
    }

    private function callProphetScript($salesData, $periods)
    {
        $scriptPath = storage_path('app/scripts/forecast.py');
        
        // Prepare input data
        $input = json_encode([
            'sales_data' => $salesData,
            'periods' => $periods
        ]);

        // Check if Python script exists
        if (!file_exists($scriptPath)) {
            return [
                'status' => 'error',
                'message' => 'Forecast script not found'
            ];
        }

        // Execute Python script
        $descriptors = [
            0 => ['pipe', 'r'],  // stdin
            1 => ['pipe', 'w'],  // stdout
            2 => ['pipe', 'w']   // stderr
        ];

        $process = proc_open("python \"$scriptPath\"", $descriptors, $pipes);

        if (is_resource($process)) {
            // Write input data
            fwrite($pipes[0], $input);
            fclose($pipes[0]);

            // Read output
            $output = stream_get_contents($pipes[1]);
            fclose($pipes[1]);

            // Read errors
            $errors = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            // Close process
            $returnCode = proc_close($process);

            // Filter out non-fatal warnings (like plotly import warnings)
            $fatalErrors = '';
            if (!empty($errors)) {
                $errorLines = explode("\n", $errors);
                $fatalLines = array_filter($errorLines, function($line) {
                    // Ignore warnings about plotly, INFO messages from cmdstanpy
                    return !empty($line) && 
                           stripos($line, 'plotly') === false &&
                           stripos($line, 'INFO') === false &&
                           stripos($line, 'WARNING') === false;
                });
                $fatalErrors = implode("\n", $fatalLines);
            }

            if ($returnCode !== 0 && !empty($fatalErrors)) {
                return [
                    'status' => 'error',
                    'message' => 'Python script error: ' . $fatalErrors
                ];
            }

            $decoded = json_decode($output, true);
            
            // If JSON decode failed or empty output
            if (json_last_error() !== JSON_ERROR_NONE || empty($decoded)) {
                return [
                    'status' => 'error',
                    'message' => 'Failed to parse forecast output. Errors: ' . $fatalErrors
                ];
            }

            return $decoded;
        }

        return [
            'status' => 'error',
            'message' => 'Failed to execute Python script'
        ];
    }
}
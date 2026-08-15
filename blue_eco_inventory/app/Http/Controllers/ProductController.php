<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    // Anyone logged in (admin, staff, distributor) can view products
    public function index()
    {
        return response()->json(Product::orderBy('name')->get());
    }

    public function show($id)
    {
        $product = Product::findOrFail($id);
        return response()->json($product);
    }

    // Only Admin can create/update/delete (enforced via route middleware)
    public function store(Request $request)
{
    $validator = Validator::make($request->all(), [
        'name' => 'required|string|max:255',
        'sku' => 'required|string|max:100|unique:products',
        'form' => 'nullable|string|max:100',
        'system_code' => 'nullable|string|max:10',
        'price' => 'required|numeric|min:0',
        'weight' => 'nullable|numeric|min:0',
        'stock_quantity' => 'sometimes|integer|min:0',
        'description' => 'nullable|string',
        'image' => 'nullable|image|max:2048',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    $data = $validator->validated();

    if ($request->hasFile('image')) {
        $data['image_path'] = $this->cloudinary->upload($request->file('image'), 'products');
    }

    $product = Product::create($data);

    return response()->json(['message' => 'Product created', 'product' => $product], 201);
}

public function update(Request $request, $id)
{
    $product = Product::findOrFail($id);

    $validator = Validator::make($request->all(), [
        'name' => 'sometimes|string|max:255',
        'sku' => 'sometimes|string|max:100|unique:products,sku,' . $id,
        'form' => 'nullable|string|max:100',
        'system_code' => 'nullable|string|max:10',
        'price' => 'sometimes|numeric|min:0',
        'weight' => 'nullable|numeric|min:0',
        'stock_quantity' => 'sometimes|integer|min:0',
        'description' => 'nullable|string',
        'image' => 'nullable|image|max:2048',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    $data = $validator->validated();

    if ($request->hasFile('image')) {
        $data['image_path'] = $this->cloudinary->upload($request->file('image'), 'products');
    }

    $product->update($data);

    return response()->json(['message' => 'Product updated', 'product' => $product]);
}

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $product->delete();

        return response()->json(['message' => 'Product deleted']);
    }

    // Anyone logged in can view top-selling products (based on ALL orders in the system)
    public function topSellers()
    {
        $topProducts = DB::table('order_items')
        ->join('products', 'order_items.product_id', '=', 'products.id')
        ->select('products.id', DB::raw('SUM(order_items.quantity) as total_sold'))
        ->groupBy('products.id')
        ->orderByDesc('total_sold')
        ->limit(3)
        ->get();
        
        return response()->json($topProducts);
    }

}
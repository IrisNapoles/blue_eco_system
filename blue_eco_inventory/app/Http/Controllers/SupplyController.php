<?php

namespace App\Http\Controllers;

use App\Models\Supply;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupplyController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    // Anyone logged in (admin, staff) can view supplies
    public function index()
    {
        return response()->json(Supply::orderBy('name')->get());
    }

    public function show($id)
    {
        $supply = Supply::findOrFail($id);
        return response()->json($supply);
    }

    // Only Admin can create/update/delete (enforced via route middleware)
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:100',
            'stock_quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->cloudinary->upload($request->file('image'), 'supplies');
        }

        $supply = Supply::create($data);

        return response()->json(['message' => 'Supply created', 'supply' => $supply], 201);
    }

    public function update(Request $request, $id)
    {
        $supply = Supply::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:100',
            'stock_quantity' => 'sometimes|integer|min:0',
            'unit' => 'sometimes|string|max:50',
            'reorder_level' => 'nullable|integer|min:0',
            'image' => 'nullable|image|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();

        if ($request->hasFile('image')) {
            $data['image_path'] = $this->cloudinary->upload($request->file('image'), 'supplies');
        }

        $supply->update($data);

        return response()->json(['message' => 'Supply updated', 'supply' => $supply]);
    }

    public function destroy($id)
    {
        $supply = Supply::findOrFail($id);
        $supply->delete();

        return response()->json(['message' => 'Supply deleted']);
    }
}
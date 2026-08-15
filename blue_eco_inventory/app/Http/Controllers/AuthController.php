<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\CloudinaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    protected CloudinaryService $cloudinary;

    public function __construct(CloudinaryService $cloudinary)
    {
        $this->cloudinary = $cloudinary;
    }

    // Public registration is ONLY for distributors, and starts as "pending"
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Step 1: Personal & Address & Contact info
            'name' => 'required|string|max:255',
            'age' => 'required|integer|min:18|max:120',
            'gender' => 'required|string|in:Male,Female,Other',
            'street_no' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'state_province' => 'required|string|max:255',
            'region' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'contact_number' => 'required|string|max:30',

            // Step 2: ID + credentials
            'id_type' => 'required|string|max:100',
            'front_id' => 'required|image|max:5120', // 5MB max
            'back_id' => 'required|image|max:5120',
            'username' => 'required|string|max:100|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $frontIdPath = $this->cloudinary->upload($request->file('front_id'), 'id_uploads');
        $backIdPath = $this->cloudinary->upload($request->file('back_id'), 'id_uploads');

        $user = User::create([
            'name' => $request->name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'distributor',
            'status' => 'pending',
            'status_updated_at' => now(),
            'age' => $request->age,
            'gender' => $request->gender,
            'street_no' => $request->street_no,
            'barangay' => $request->barangay,
            'city' => $request->city,
            'state_province' => $request->state_province,
            'region' => $request->region,
            'contact_number' => $request->contact_number,
            'id_type' => $request->id_type,
            'front_id_path' => $frontIdPath,
            'back_id_path' => $backIdPath,
        ]);

        return response()->json([
            'message' => 'Registration submitted. Please wait for admin approval before logging in.',
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status === 'pending') {
            return response()->json(['message' => 'Your account is pending admin approval.'], 403);
        }

        if ($user->status === 'declined') {
            return response()->json(['message' => 'Your registration was declined.'], 403);
        }

        if ($user->status === 'inactive') {
            return response()->json(['message' => 'Your account has been deactivated. Please contact the administrator.'], 403);
        }

        $user->last_login_at = now();
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    // Staff/Distributor can update their own name, password, contact info, and address
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'password' => 'sometimes|string|min:8|confirmed',
            'contact_number' => 'sometimes|string|max:30',
            'street_no' => 'sometimes|string|max:255',
            'barangay' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'state_province' => 'sometimes|string|max:255',
            'region' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->has('name')) {
            $user->name = $request->name;
        }
        if ($request->has('password')) {
            $user->password = Hash::make($request->password);
        }
        if ($request->has('contact_number')) {
            $user->contact_number = $request->contact_number;
        }
        foreach (['street_no', 'barangay', 'city', 'state_province', 'region'] as $addressField) {
            if ($request->has($addressField)) {
                $user->{$addressField} = $request->{$addressField};
            }
        }
        $user->save();

        return response()->json(['message' => 'Profile updated', 'user' => $user]);
    }
}
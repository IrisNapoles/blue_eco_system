<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    // Admin creates a Staff account directly (auto-approved)
    public function createStaff(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $staff = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'staff',
            'status' => 'active',
            'status_updated_at' => now(),
        ]);

        return response()->json(['message' => 'Staff account created', 'user' => $staff], 201);
    }

    // List pending distributor signups
    public function pendingDistributors()
    {
        $pending = User::where('role', 'distributor')
            ->where('status', 'pending')
            ->get();

        return response()->json($pending);
    }

    // Approve a distributor
    public function approveDistributor($id)
    {
        $user = User::where('id', $id)->where('role', 'distributor')->firstOrFail();
        $user->status = 'active';
        $user->status_updated_at = now();
        $user->save();

        return response()->json(['message' => 'Distributor approved', 'user' => $user]);
    }

    // Decline a distributor
    public function declineDistributor($id)
    {
        $user = User::where('id', $id)->where('role', 'distributor')->firstOrFail();
        $user->status = 'declined';
        $user->status_updated_at = now();
        $user->save();

        return response()->json(['message' => 'Distributor declined', 'user' => $user]);
    }

    // List all users (optional, useful for admin dashboard)
    public function allUsers()
    {
        return response()->json(User::all());
    }

    // Admin edits an existing account (name, username, password, role, status)
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'username' => 'sometimes|required|string|max:100|unique:users,username,' . $user->id,
            'password' => 'sometimes|nullable|string|min:8',
            'role' => 'sometimes|required|string|in:admin,staff,distributor',
            // pending/declined are set only by the registration/approval flow,
            // not editable directly here.
            'status' => 'sometimes|required|string|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->filled('name')) {
            $user->name = $request->name;
        }
        if ($request->filled('username')) {
            $user->username = $request->username;
        }
        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }
        if ($request->filled('role')) {
            $user->role = $request->role;
        }
        if ($request->filled('status')) {
            $user->status = $request->status;
            $user->status_updated_at = now();
        }

        $user->save();

        return response()->json(['message' => 'Account updated', 'user' => $user]);
    }

    // Admin toggles a user's account between Active and Inactive.
    // This is the only thing an admin can edit for an existing account.
    public function updateUserStatus(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|string|in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot change the status of your own account.'], 422);
        }

        $user->status = $request->status;
        $user->status_updated_at = now();
        $user->save();

        return response()->json(['message' => 'Status updated', 'user' => $user]);
    }

    // Admin removes a staff/user account
    public function deleteUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Account removed']);
    }
}
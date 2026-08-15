<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    // Any logged-in user (admin, staff, distributor) sees their own notifications.
    public function index(Request $request)
    {
        $notifications = $request->user()->notifications()->latest()->take(50)->get();

        return response()->json([
            'notifications' => $notifications->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? 'general',
                'title' => $n->data['title'] ?? '',
                'body' => $n->data['body'] ?? '',
                'order_id' => $n->data['order_id'] ?? null,
                'image_url' => $n->data['image_url'] ?? null,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at,
            ]),
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markRead(Request $request, $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        $notification->markAsRead();

        return response()->json(['message' => 'Marked as read']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read']);
    }
}
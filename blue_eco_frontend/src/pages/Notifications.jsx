import { useState, useEffect, useCallback } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/notificationApi'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    getNotifications()
      .then((data) => {
        setNotifications(data.notifications)
        setUnreadCount(data.unread_count)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleMarkRead(id) {
    await markNotificationRead(id)
    load()
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">
          Notifications {unreadCount > 0 && <span className="text-brand-500">({unreadCount})</span>}
        </h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm text-brand-600 hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-xl border border-border p-4 ${
              n.read ? 'bg-surface' : 'bg-brand-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-ink text-sm">{n.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="shrink-0 text-xs text-brand-600 hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-8">No notifications yet.</p>
        )}
      </div>
    </div>
  )
}

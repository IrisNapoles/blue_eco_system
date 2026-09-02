import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/notificationApi'
import { PageHeader, EmptyState, LoadingState } from '../components/ui'

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

  if (loading) return <LoadingState />

  return (
    <div className="font-['Plus_Jakarta_Sans']">
      <PageHeader
        title={
          <>
            Notifications {unreadCount > 0 && <span className="text-brand-500">({unreadCount})</span>}
          </>
        }
        actions={
          unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm font-semibold text-brand-500 hover:underline">
              Mark all as read
            </button>
          )
        }
      />

      <div className="mt-4 space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`rounded-2xl p-4 shadow-sm ${n.read ? 'bg-white' : 'bg-brand-100'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-ink">{n.title}</p>
                <p className="mt-1 text-sm text-ink/60">{n.body}</p>
                <p className="mt-1 text-xs text-ink/40">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="shrink-0 text-xs font-semibold text-brand-500 hover:underline"
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <EmptyState icon={Bell} title="No notifications yet" description="You're all caught up." />
        )}
      </div>
    </div>
  )
}

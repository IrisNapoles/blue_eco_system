import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import {
  createStaff,
  getPendingDistributors,
  approveDistributor,
  declineDistributor,
  getAllUsers,
  updateUserStatus,
  deleteUser,
} from '../lib/userApi'

const ROLE_LABEL = { admin: 'Admin', staff: 'Staff', distributor: 'Distributor' }
const STATUS_STYLES = {
  active: 'bg-brand-50 text-brand-600',
  inactive: 'bg-canvas text-ink-soft',
  pending: 'bg-alert-50 text-alert-700',
  declined: 'bg-danger-50 text-danger-700',
}

export default function Users() {
  const { user: currentUser } = useAuth()
  const [pending, setPending] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [staffModalOpen, setStaffModalOpen] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getPendingDistributors(), getAllUsers()])
      .then(([p, u]) => {
        setPending(p)
        setUsers(u)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleApprove(id) {
    await approveDistributor(id)
    load()
  }

  async function handleDecline(id) {
    if (!confirm('Decline this distributor application?')) return
    await declineDistributor(id)
    load()
  }

  async function handleToggleStatus(u) {
    const next = u.status === 'active' ? 'inactive' : 'active'
    await updateUserStatus(u.id, next)
    load()
  }

  async function handleDelete(u) {
    if (!confirm(`Remove "${u.name}"'s account? This cannot be undone.`)) return
    await deleteUser(u.id)
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">Users</h1>
        <button
          onClick={() => setStaffModalOpen(true)}
          className="rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
        >
          + Add staff account
        </button>
      </div>

      {pending.length > 0 && (
        <>
          <h2 className="mt-6 font-display text-base font-semibold text-ink">
            Pending Distributor Applications ({pending.length})
          </h2>
          <div className="mt-3 space-y-2">
            {pending.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-alert-500/30 bg-alert-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{p.name}</p>
                  <p className="text-xs text-ink-soft">{p.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(p.id)}
                    className="rounded-md bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDecline(p.id)}
                    className="rounded-md border border-danger-500 text-danger-500 hover:bg-danger-50 px-3 py-1.5 text-xs font-medium"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 font-display text-base font-semibold text-ink">All Users</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id
              return (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {u.name} {isSelf && <span className="text-xs text-ink-soft">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[u.role] || u.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[u.status] || 'bg-canvas text-ink-soft'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isSelf && ['active', 'inactive'].includes(u.status) && (
                      <>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="text-brand-600 hover:underline text-xs mr-3"
                        >
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="text-danger-500 hover:underline text-xs"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {staffModalOpen && (
        <Modal title="Add staff account" onClose={() => setStaffModalOpen(false)}>
          <StaffForm
            onCancel={() => setStaffModalOpen(false)}
            onDone={() => {
              setStaffModalOpen(false)
              load()
            }}
          />
        </Modal>
      )}
    </div>
  )
}

function StaffForm({ onCancel, onDone }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createStaff({ name, email, password })
      onDone()
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : 'Could not create this account.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
        <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white"
        >
          {saving ? 'Creating…' : 'Create account'}
        </button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../lib/profileApi'

export default function AccountSettings() {
  const { user } = useAuth()
  const [values, setValues] = useState({
    name: user?.name || '',
    contact_number: user?.contact_number || '',
    street_no: user?.street_no || '',
    barangay: user?.barangay || '',
    city: user?.city || '',
    state_province: user?.state_province || '',
    region: user?.region || '',
  })
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const payload = { ...values }
    if (password) {
      if (password !== passwordConfirm) {
        setError('Passwords do not match.')
        return
      }
      payload.password = password
      payload.password_confirmation = passwordConfirm
    }

    setSaving(true)
    try {
      const { user: updated } = await updateProfile(payload)
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      localStorage.setItem('user', JSON.stringify({ ...stored, ...updated }))
      setSuccess(true)
      setPassword('')
      setPasswordConfirm('')
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(' ')
          : 'Could not save changes.'
      )
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, required = false) => (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        required={required}
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
      />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink">Account Settings</h1>

      <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-border bg-surface p-5 space-y-4">
        {error && (
          <div className="rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-brand-50 border border-brand-500/30 px-3 py-2 text-sm text-brand-600">
            Changes saved.
          </div>
        )}

        {field('Full name', 'name', true)}
        <p className="text-xs text-ink-soft -mt-2">{user?.email}</p>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-ink mb-3">Contact & Address</p>
          <div className="space-y-3">
            {field('Contact number', 'contact_number')}
            {field('Street / house no.', 'street_no')}
            <div className="grid grid-cols-2 gap-3">
              {field('Barangay', 'barangay')}
              {field('City', 'city')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field('State / Province', 'state_province')}
              {field('Region', 'region')}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-ink mb-3">Change Password</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="Leave blank to keep current password"
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
              />
            </div>
            {password && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  minLength={8}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-5 py-2.5 text-sm font-medium text-white"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

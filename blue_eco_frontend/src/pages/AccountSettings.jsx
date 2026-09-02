import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateProfile } from '../lib/profileApi'
import { styles } from '../components/ui'

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
      <label className={styles.label}>{label}</label>
      <input
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        required={required}
        className={styles.input}
      />
    </div>
  )

  return (
    <div className="mx-auto max-w-lg font-['Plus_Jakarta_Sans']">
      <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Account Settings</h1>

      <form onSubmit={handleSubmit} className={`mt-4 space-y-4 ${styles.card}`}>
        {error && <div className={styles.errorBox}>{error}</div>}
        {success && <div className={styles.successBox}>Changes saved.</div>}

        {field('Full name', 'name', true)}
        <p className="-mt-2 text-xs text-ink/40">{user?.email}</p>

        <div className="border-t border-ink/10 pt-4">
          <p className="mb-3 text-sm font-bold text-ink">Contact & Address</p>
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

        <div className="border-t border-ink/10 pt-4">
          <p className="mb-3 text-sm font-bold text-ink">Change Password</p>
          <div className="space-y-3">
            <div>
              <label className={styles.label}>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="Leave blank to keep current password"
                className={styles.input}
              />
            </div>
            {password && (
              <div>
                <label className={styles.label}>Confirm new password</label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  minLength={8}
                  className={styles.input}
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

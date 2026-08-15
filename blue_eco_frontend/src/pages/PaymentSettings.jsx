import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getPaymentSettings, updatePaymentSettings } from '../lib/paymentSettingApi'

export default function PaymentSettings() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  function load() {
    setLoading(true)
    getPaymentSettings()
      .then(setSettings)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold text-ink">Payment Settings</h1>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)} className="text-sm text-brand-600 hover:underline">
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <PaymentSettingsForm
          initial={settings}
          onCancel={() => setEditing(false)}
          onDone={() => {
            setEditing(false)
            load()
          }}
        />
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-2">GCash</p>
            {settings?.gcash_qr_url && (
              <img
                src={settings.gcash_qr_url}
                alt="GCash QR code"
                className="w-40 h-40 object-contain rounded-md border border-border mb-3"
              />
            )}
            <p className="text-sm text-ink">{settings?.gcash_account_name || '—'}</p>
            <p className="text-sm text-ink-soft font-mono">{settings?.gcash_account_number || '—'}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-2">Bank Transfer</p>
            <p className="text-sm text-ink">{settings?.bank_name || '—'}</p>
            <p className="text-sm text-ink">{settings?.bank_account_name || '—'}</p>
            <p className="text-sm text-ink-soft font-mono">{settings?.bank_account_number || '—'}</p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wide text-ink-soft mb-2">Shop origin (for delivery estimates)</p>
            <p className="text-sm text-ink-soft">
              {[settings?.shop_barangay, settings?.shop_city, settings?.shop_province, settings?.shop_region]
                .filter(Boolean)
                .join(', ') || '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function PaymentSettingsForm({ initial, onCancel, onDone }) {
  const [values, setValues] = useState({
    gcash_account_name: initial?.gcash_account_name || '',
    gcash_account_number: initial?.gcash_account_number || '',
    bank_name: initial?.bank_name || '',
    bank_account_name: initial?.bank_account_name || '',
    bank_account_number: initial?.bank_account_number || '',
    shop_city: initial?.shop_city || '',
    shop_barangay: initial?.shop_barangay || '',
    shop_province: initial?.shop_province || '',
    shop_region: initial?.shop_region || '',
  })
  const [qrImage, setQrImage] = useState(null)
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData()
    Object.entries(values).forEach(([k, v]) => v && formData.append(k, v))
    if (qrImage) formData.append('qr_image', qrImage)
    try {
      await updatePaymentSettings(formData)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key) => (
    <div>
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      <input
        value={values[key]}
        onChange={(e) => update(key, e.target.value)}
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-xl border border-border bg-surface p-5">
      <p className="text-sm font-medium text-ink">GCash</p>
      <div className="grid grid-cols-2 gap-3">
        {field('Account name', 'gcash_account_name')}
        {field('Account number', 'gcash_account_number')}
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">QR code image</label>
        <input type="file" accept="image/*" onChange={(e) => setQrImage(e.target.files?.[0] || null)} className="w-full text-sm" />
      </div>

      <p className="text-sm font-medium text-ink pt-2">Bank Transfer</p>
      {field('Bank name', 'bank_name')}
      <div className="grid grid-cols-2 gap-3">
        {field('Account name', 'bank_account_name')}
        {field('Account number', 'bank_account_number')}
      </div>

      <p className="text-sm font-medium text-ink pt-2">Shop origin</p>
      <div className="grid grid-cols-2 gap-3">
        {field('Barangay', 'shop_barangay')}
        {field('City', 'shop_city')}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('Province', 'shop_province')}
        {field('Region', 'shop_region')}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  )
}

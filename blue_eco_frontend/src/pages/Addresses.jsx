import { useState, useEffect, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../lib/addressApi'

const EMPTY = {
  recipient_name: '',
  contact_number: '',
  street_no: '',
  barangay: '',
  city: '',
  state_province: '',
  region: '',
  is_default: false,
}

const MAX_ADDRESSES = 3

export default function Addresses() {
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    getAddresses()
      .then(setAddresses)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleDelete(id) {
    if (!id || id === 0) return
    if (!confirm('Remove this address?')) return
    await deleteAddress(id)
    load()
  }

  async function handleSetDefault(id) {
    if (!id || id === 0) return
    await setDefaultAddress(id)
    load()
  }

  const realAddresses = addresses.filter((a) => a.id !== 0)
  const canAddMore = realAddresses.length < MAX_ADDRESSES

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  if (showForm) {
    return (
      <AddressForm
        initial={editing}
        onCancel={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSaved={() => {
          setShowForm(false)
          setEditing(null)
          load()
        }}
      />
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink">Address Selection</h1>

      <div className="mt-4 space-y-3">
        {realAddresses.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 ${a.is_default ? 'border-brand-500' : 'border-border'}`}
          >
            <div className="flex items-start justify-between">
              <label className="flex items-start gap-3 cursor-pointer flex-1">
                <input
                  type="radio"
                  checked={a.is_default}
                  onChange={() => handleSetDefault(a.id)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium text-ink">
                    {a.recipient_name} | {a.contact_number}
                  </p>
                  <p className="text-sm text-ink-soft mt-0.5">
                    {a.combined_address ||
                      [a.street_no, a.barangay, a.city, a.state_province, a.region].filter(Boolean).join(', ')}
                  </p>
                  {a.is_default && (
                    <span className="mt-2 inline-block rounded-full border border-brand-500 text-brand-600 px-3 py-0.5 text-xs">
                      Default
                    </span>
                  )}
                </div>
              </label>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setEditing(a)
                    setShowForm(true)
                  }}
                  className="text-sm text-brand-600 hover:underline"
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(a.id)} className="text-danger-500">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {realAddresses.length === 0 && (
          <p className="text-sm text-ink-soft text-center py-8">No saved addresses yet.</p>
        )}
      </div>

      {canAddMore ? (
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="mt-4 w-full rounded-md border border-brand-500 text-brand-600 hover:bg-brand-50 px-4 py-2.5 text-sm font-medium"
        >
          + Add a new address
        </button>
      ) : (
        <p className="mt-4 text-xs text-ink-soft text-center">
          Maximum of {MAX_ADDRESSES} addresses reached. Remove one to add another.
        </p>
      )}
    </div>
  )
}

function AddressForm({ initial, onCancel, onSaved }) {
  const [values, setValues] = useState(initial && initial.id ? initial : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function update(key, value) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (initial?.id) {
        await updateAddress(initial.id, values)
      } else {
        await createAddress(values)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save this address.')
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, placeholder) => (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-ink-soft mb-1">{label}</label>
      <input
        value={values[key] || ''}
        onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder}
        required
        className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
      />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onCancel} className="text-ink-soft">←</button>
        <h1 className="font-display text-xl font-semibold text-ink">
          {initial?.id ? 'Edit Address' : 'Add a New Address'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {field('Recipient Name', 'recipient_name', 'e.g. Juan Dela Cruz')}
        {field('Contact Number', 'contact_number', 'e.g. 0934567890')}
        {field('Street / House No.', 'street_no', 'e.g. 123 Rizal St.')}
        {field('Barangay', 'barangay', 'e.g. Malabanan')}
        {field('City / Municipality', 'city', 'e.g. Calamba')}
        {field('Province', 'state_province', 'e.g. Laguna')}
        {field('Region', 'region', 'e.g. Region IV-A')}

        <label className="flex items-center gap-2 text-sm text-ink pt-1">
          <input
            type="checkbox"
            checked={!!values.is_default}
            onChange={(e) => update('is_default', e.target.checked)}
          />
          Set as default address
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-md bg-brand-700 hover:bg-brand-600 disabled:opacity-60 px-4 py-3 text-sm font-medium text-white"
        >
          {saving ? 'Saving…' : 'Save Address'}
        </button>
      </form>
    </div>
  )
}

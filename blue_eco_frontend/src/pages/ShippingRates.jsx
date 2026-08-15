import { useState, useEffect } from 'react'
import { getShippingRates, updateShippingRate } from '../lib/shippingRateApi'

export default function ShippingRates() {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState({}) // { [id]: { fee, per_kg_rate, min_days, max_days } }
  const [saving, setSaving] = useState({}) // { [id]: bool }
  const [savedFlash, setSavedFlash] = useState({}) // { [id]: bool }

  function load() {
    setLoading(true)
    getShippingRates()
      .then((data) => {
        setRates(data)
        const initial = {}
        data.forEach((r) => {
          initial[r.id] = {
            fee: r.fee,
            per_kg_rate: r.per_kg_rate,
            min_days: r.min_days,
            max_days: r.max_days,
          }
        })
        setEditing(initial)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function updateField(id, field, value) {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function handleSave(id) {
    setSaving((s) => ({ ...s, [id]: true }))
    try {
      await updateShippingRate(id, editing[id])
      setSavedFlash((s) => ({ ...s, [id]: true }))
      setTimeout(() => setSavedFlash((s) => ({ ...s, [id]: false })), 1500)
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Shipping Rates</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Delivery fee = base fee (covers the first kg) + per-kg rate × every additional kg (rounded up).
      </p>

      <div className="mt-5 space-y-4">
        {rates.map((r) => {
          const e = editing[r.id] || {}
          return (
            <div key={r.id} className="rounded-xl border border-border bg-surface p-5">
              <p className="font-display text-base font-semibold text-ink mb-3">{r.tier}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Base fee (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={e.fee ?? ''}
                    onChange={(ev) => updateField(r.id, 'fee', ev.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Per extra kg (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={e.per_kg_rate ?? ''}
                    onChange={(ev) => updateField(r.id, 'per_kg_rate', ev.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Min days</label>
                  <input
                    type="number"
                    min="1"
                    value={e.min_days ?? ''}
                    onChange={(ev) => updateField(r.id, 'min_days', ev.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-soft mb-1">Max days</label>
                  <input
                    type="number"
                    min="1"
                    value={e.max_days ?? ''}
                    onChange={(ev) => updateField(r.id, 'max_days', ev.target.value)}
                    className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleSave(r.id)}
                  disabled={saving[r.id]}
                  className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white"
                >
                  {saving[r.id] ? 'Saving…' : savedFlash[r.id] ? 'Saved ✓' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

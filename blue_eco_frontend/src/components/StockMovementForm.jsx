import { useState } from 'react'

const today = () => new Date().toISOString().slice(0, 10)

export default function StockMovementForm({ batches, onSubmit, onCancel, saving }) {
  const [batchId, setBatchId] = useState(batches[0]?.id || '')
  const [quantity, setQuantity] = useState('')
  const [destination, setDestination] = useState('')
  const [movedAt, setMovedAt] = useState(today())
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const selectedBatch = batches.find((b) => b.id == batchId)

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    try {
      await onSubmit({
        stock_batch_id: batchId,
        quantity: Number(quantity),
        destination,
        moved_at: movedAt,
        notes: notes || null,
      })
    } catch (err) {
      const data = err.response?.data
      if (data?.errors) {
        setErrors(data.errors)
      } else if (data?.message) {
        setErrors({ quantity: [data.message] })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Batch</label>
        <select
          value={batchId}
          onChange={(e) => setBatchId(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        >
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.product?.name}
              {b.product?.weight ? ` — ${b.product.weight}g` : ''} · {b.batch_no} ({b.quantity} in
              batch)
            </option>
          ))}
        </select>
        {errors.stock_batch_id && (
          <p className="mt-1 text-xs text-danger-500">{errors.stock_batch_id[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Quantity to bring</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
          {selectedBatch && (
            <p className="mt-1 text-xs text-ink-soft">Batch has {selectedBatch.quantity} total.</p>
          )}
          {errors.quantity && <p className="mt-1 text-xs text-danger-500">{errors.quantity[0]}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Date</label>
          <input
            type="date"
            value={movedAt}
            onChange={(e) => setMovedAt(e.target.value)}
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Destination</label>
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Parañaque Bazaar"
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
        {errors.destination && <p className="mt-1 text-xs text-danger-500">{errors.destination[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
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
          {saving ? 'Saving…' : 'Log movement'}
        </button>
      </div>
    </form>
  )
}

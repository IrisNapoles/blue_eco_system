import { useState, useEffect } from 'react'
import { getNextBatchNumber } from '../lib/inventoryApi'

export default function StockBatchForm({ products, onSubmit, onCancel, saving }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [batchNo, setBatchNo] = useState('')
  const [quantity, setQuantity] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [bestBefore, setBestBefore] = useState('')
  const [errors, setErrors] = useState({})

  // Whenever the selected product changes, ask Laravel for a suggested
  // batch number (it already knows the numbering pattern per product).
  useEffect(() => {
    if (!productId) return
    getNextBatchNumber(productId)
      .then(setBatchNo)
      .catch(() => {})
  }, [productId])

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await onSubmit({
        product_id: productId,
        batch_no: batchNo,
        quantity: Number(quantity),
        warehouse: warehouse || null,
        best_before: bestBefore || null,
      })
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.weight ? ` — ${p.weight}g` : ''}
              {p.sku ? ` (${p.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Batch number</label>
        <input
          value={batchNo}
          onChange={(e) => setBatchNo(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500 font-mono"
        />
        <p className="mt-1 text-xs text-ink-soft">Auto-suggested — feel free to edit.</p>
        {errors.batch_no && <p className="mt-1 text-xs text-danger-500">{errors.batch_no[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
          {errors.quantity && <p className="mt-1 text-xs text-danger-500">{errors.quantity[0]}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Warehouse</label>
          <input
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Best before (optional)</label>
        <input
          type="date"
          value={bestBefore}
          onChange={(e) => setBestBefore(e.target.value)}
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
          {saving ? 'Saving…' : 'Add stock batch'}
        </button>
      </div>
    </form>
  )
}

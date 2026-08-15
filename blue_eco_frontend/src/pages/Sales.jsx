import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProducts } from '../lib/inventoryApi'
import { getSales, createSale } from '../lib/salesApi'

export default function Sales() {
  const { user } = useAuth()
  const isStaff = user?.role === 'staff'
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState([{ product_id: '', quantity: 1 }])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getProducts(), getSales()])
      .then(([p, s]) => {
        setProducts(p)
        setSales(s)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function updateCartRow(index, field, value) {
    setCart((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  function addRow() {
    setCart((rows) => [...rows, { product_id: '', quantity: 1 }])
  }

  function removeRow(index) {
    setCart((rows) => rows.filter((_, i) => i !== index))
  }

  const cartTotal = cart.reduce((sum, row) => {
    const product = products.find((p) => String(p.id) === String(row.product_id))
    if (!product) return sum
    return sum + Number(product.price) * Number(row.quantity || 0)
  }, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const items = cart
      .filter((r) => r.product_id && r.quantity > 0)
      .map((r) => ({ product_id: Number(r.product_id), quantity: Number(r.quantity) }))

    if (items.length === 0) {
      setFormError('Add at least one product.')
      return
    }

    setSubmitting(true)
    try {
      await createSale(items)
      setCart([{ product_id: '', quantity: 1 }])
      load()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not record this sale.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">
        {isStaff ? 'Record Sale' : 'Sales'}
      </h1>

      {isStaff && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-xl border border-border bg-surface p-5 space-y-3"
        >
          {formError && (
            <div className="rounded-md bg-danger-50 border border-danger-500/30 px-3 py-2 text-sm text-danger-700">
              {formError}
            </div>
          )}

          {cart.map((row, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={row.product_id}
                onChange={(e) => updateCartRow(i, 'product_id', e.target.value)}
                required
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ₱{Number(p.price).toFixed(2)} ({p.stock_quantity} in stock)
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={row.quantity}
                onChange={(e) => updateCartRow(i, 'quantity', e.target.value)}
                className="w-24 rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
              />
              {cart.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="px-2 py-2 text-danger-500 text-sm"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={addRow}
            className="text-sm text-brand-600 hover:underline"
          >
            + Add another product
          </button>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-sm text-ink-soft">
              Total: <span className="font-semibold text-ink">₱{cartTotal.toFixed(2)}</span>
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-5 py-2 text-sm font-medium text-white"
            >
              {submitting ? 'Recording…' : 'Record sale'}
            </button>
          </div>
        </form>
      )}

      <h2 className="mt-8 font-display text-base font-semibold text-ink">Sales history</h2>
      {loading ? (
        <p className="mt-2 text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(s.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {s.items?.map((it) => `${it.product?.name} ×${it.quantity}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    ₱{Number(s.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-ink-soft">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

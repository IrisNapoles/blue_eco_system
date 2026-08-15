import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getProducts } from '../lib/inventoryApi'
import { getWasteLog, createWasteLog, updateWasteLogStatus } from '../lib/wasteApi'

const STATUS_STYLES = {
  'Logged for Review': 'bg-alert-50 text-alert-700',
  Confirmed: 'bg-brand-50 text-brand-600',
  Rejected: 'bg-danger-50 text-danger-700',
}

export default function WasteLog() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isStaff = user?.role === 'staff'

  const [products, setProducts] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [image, setImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getProducts(), getWasteLog()])
      .then(([p, l]) => {
        setProducts(p)
        setLogs(l)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)
    const formData = new FormData()
    formData.append('product_id', productId)
    formData.append('quantity', quantity)
    formData.append('reason', reason)
    if (image) formData.append('image', image)

    setSubmitting(true)
    try {
      await createWasteLog(formData)
      setProductId('')
      setQuantity('')
      setReason('')
      setImage(null)
      load()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not log this waste entry.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReview(id, status) {
    await updateWasteLogStatus(id, status)
    load()
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Waste Log</h1>

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink mb-1">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
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
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g. Damaged packaging, spoiled"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Photo (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-60 px-5 py-2 text-sm font-medium text-white"
            >
              {submitting ? 'Logging…' : 'Log waste'}
            </button>
          </div>
        </form>
      )}

      <h2 className="mt-8 font-display text-base font-semibold text-ink">
        {isAdmin ? 'Waste entries — review' : 'Waste history'}
      </h2>
      {loading ? (
        <p className="mt-2 text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{l.product?.name}</td>
                  <td className="px-4 py-3">{l.quantity}</td>
                  <td className="px-4 py-3">{l.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[l.status] || 'bg-canvas text-ink-soft'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {l.status === 'Logged for Review' && (
                        <>
                          <button
                            onClick={() => handleReview(l.id, 'Confirmed')}
                            className="text-brand-600 hover:underline text-xs mr-3"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => handleReview(l.id, 'Rejected')}
                            className="text-danger-500 hover:underline text-xs"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-ink-soft">
                    No waste entries yet.
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

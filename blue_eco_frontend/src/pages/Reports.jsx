import { useState, useEffect, useCallback } from 'react'
import { getSalesVsWaste, getTopProducts } from '../lib/reportApi'

export default function Reports() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [summary, setSummary] = useState(null)
  const [topProducts, setTopProducts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    const params = {}
    if (from) params.from = from
    if (to) params.to = to

    Promise.all([getSalesVsWaste(params), getTopProducts({ ...params, limit: 10 })])
      .then(([s, t]) => {
        setSummary(s)
        setTopProducts(t)
      })
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display text-xl font-semibold text-ink">Reports</h1>
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500"
          />
          <span className="text-ink-soft">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-border px-2 py-1.5 text-sm focus:border-brand-500"
          />
          {(from || to) && (
            <button
              onClick={() => {
                setFrom('')
                setTo('')
              }}
              className="text-brand-600 hover:underline text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Total Sales</p>
              <p className="mt-2 font-display text-2xl font-semibold text-brand-600">
                ₱{Number(summary?.sales?.total_amount || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Waste Value</p>
              <p className="mt-2 font-display text-2xl font-semibold text-danger-500">
                ₱{Number(summary?.waste?.total_value || 0).toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {summary?.waste?.total_units || 0} units
              </p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wide text-ink-soft">Net</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">
                ₱{Number(summary?.net_amount || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <h2 className="mt-8 font-display text-base font-semibold text-ink">Top Products</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Units sold</th>
                  <th className="px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.product_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="text-ink-soft mr-2">#{i + 1}</span>
                      {p.product_name}
                    </td>
                    <td className="px-4 py-3">{p.units_sold}</td>
                    <td className="px-4 py-3">₱{Number(p.revenue).toFixed(2)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-ink-soft">
                      No sales in this period yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {summary?.waste?.by_product?.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-base font-semibold text-ink">Waste by Product</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Units wasted</th>
                      <th className="px-4 py-3">Value lost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.waste.by_product.map((w) => (
                      <tr key={w.product_id} className="border-b border-border last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{w.product_name}</td>
                        <td className="px-4 py-3">{w.units_wasted}</td>
                        <td className="px-4 py-3 text-danger-500">
                          ₱{Number(w.value_wasted).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

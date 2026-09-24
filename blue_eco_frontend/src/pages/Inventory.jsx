import { useState, useEffect, useCallback, Fragment } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ProductForm from '../components/ProductForm'
import StockBatchForm from '../components/StockBatchForm'
import StockMovementForm from '../components/StockMovementForm'
import SupplyForm from '../components/SupplyForm'
import PrintBarcodesModal from '../components/PrintBarcodesModal'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockBatches,
  createStockBatch,
  getStockMovements,
  createStockMovement,
  markMovementReturned,
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  LOW_STOCK_THRESHOLD,
  NEAR_EXPIRY_DAYS,
  WAREHOUSES,
  normalizeWarehouse,
} from '../lib/inventoryApi'

const TABS = ['Products', 'Stock Batches', 'Transfer Log', 'Supplies']

export default function Inventory() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [tab, setTab] = useState('Products')

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Inventory</h1>

      <div className="mt-4 flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'Products' && <ProductsTab isAdmin={isAdmin} />}
        {tab === 'Stock Batches' && <StockBatchesTab isAdmin={isAdmin} currentUser={user} />}
        {tab === 'Transfer Log' && <TransferLogTab isAdmin={isAdmin} />}
        {tab === 'Supplies' && <SuppliesTab isAdmin={isAdmin} />}
      </div>
    </div>
  )
}

// --- Products ---
function ProductsTab({ isAdmin }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getProducts()
      .then(setProducts)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(formData) {
    setSaving(true)
    try {
      if (editing) {
        await updateProduct(editing.id, formData)
      } else {
        await createProduct(formData)
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    await deleteProduct(product.id)
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading products…</p>

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            className="rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add product
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-12 text-center text-sm text-ink-soft">
          No products yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => {
            const low = p.stock_quantity <= LOW_STOCK_THRESHOLD
            const imageUrl = p.image_path || null

            return (
              <div
                key={p.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-bg-soft">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div
                    className="flex h-full w-full items-center justify-center text-ink-soft"
                    style={{ display: imageUrl ? 'none' : 'flex' }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="h-10 w-10 opacity-40"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18M3 19.5h18M4.5 4.5v15m15-15v15"
                      />
                    </svg>
                  </div>

                  {low && (
                    <span className="absolute top-2 left-2 rounded-full bg-alert-50 px-2 py-0.5 text-[11px] font-medium text-alert-700 shadow-sm">
                      Low stock
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-1 p-3">
                  <h3 className="line-clamp-2 text-sm font-medium text-ink" title={p.name}>
                    {p.name}
                    {p.weight ? (
                      <span className="font-normal text-ink-soft"> {parseFloat(p.weight)}g</span>
                    ) : null}
                  </h3>
                  <p className="font-mono text-[11px] text-ink-soft">{p.sku}</p>

                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="text-sm font-semibold text-ink">
                      ₱{Number(p.price).toFixed(2)}
                    </span>
                    <span className={low ? 'text-xs font-medium text-alert-700' : 'text-xs text-ink-soft'}>
                      {p.stock_quantity} in stock
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="mt-2 grid grid-cols-2 border-t border-border pt-2 -mx-3 px-3">
                      <button
                        onClick={() => {
                          setEditing(p)
                          setModalOpen(true)
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-ink-soft hover:bg-canvas hover:text-brand-600"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 6.75L17.25 9M6 18h12"
                          />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-ink-soft border-l border-border hover:bg-danger-50 hover:text-danger-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          className="h-3.5 w-3.5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.166L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.166m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <Modal title={editing ? 'Edit product' : 'Add product'} onClose={() => setModalOpen(false)}>
          <ProductForm
            initial={editing}
            saving={saving}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
    </div>
  )
}

// --- Stock Batches (grouped per product, with per-warehouse stock) ---
function StockBatchesTab({ isAdmin, currentUser }) {
  const [batches, setBatches] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printingBatch, setPrintingBatch] = useState(null)
  const [reprintConfirmBatch, setReprintConfirmBatch] = useState(null)
  const [reprintReasonInput, setReprintReasonInput] = useState('')
  const [reprintReason, setReprintReason] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [expanded, setExpanded] = useState({})

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getStockBatches(), getProducts()])
      .then(([b, p]) => {
        setBatches(b)
        setProducts(p)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      await createStockBatch(payload)
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  function isNearExpiry(dateStr) {
    if (!dateStr) return false
    const diffDays = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= NEAR_EXPIRY_DAYS
  }

  const warehouseOf = (b) => normalizeWarehouse(b.warehouse)
  const qtyOf = (b) => Number(b.quantity) || 0

  // Any warehouse name that already exists in the data but isn't one of the
  // presets still gets its own column, so nothing is ever hidden. Since
  // movements now literally create a batch row at the destination
  // warehouse, a destination like "Parañaque" already shows up here the
  // moment a movement is logged — no extra bookkeeping needed.
  const extraWarehouses = [...new Set(batches.map(warehouseOf))].filter(
    (w) => !WAREHOUSES.includes(w)
  )
  const columns = [...WAREHOUSES, ...extraWarehouses]

  const warehouseTotals = {}
  for (const b of batches) {
    const w = warehouseOf(b)
    warehouseTotals[w] = (warehouseTotals[w] || 0) + qtyOf(b)
  }
  const grandTotal = batches.reduce((sum, b) => sum + qtyOf(b), 0)

  const visible = batches.filter(
    (b) =>
      (warehouseFilter === 'All' || warehouseOf(b) === warehouseFilter) &&
      (categoryFilter === 'All' || (b.product?.form || 'Other') === categoryFilter)
  )

  // Categories (product "form" — Tablet, Capsule, Powder…) present in the
  // current stock, so the filter only ever lists options that exist.
  const categories = [...new Set(batches.map((b) => b.product?.form || 'Other'))].sort((a, b) =>
    a.localeCompare(b)
  )

  // Group the visible batches per product.
  const groups = []
  const byProduct = new Map()
  for (const b of visible) {
    const key = b.product?.id ?? `name:${b.product?.name}`
    if (!byProduct.has(key)) {
      const group = { key, product: b.product, batches: [], total: 0, perWarehouse: {} }
      byProduct.set(key, group)
      groups.push(group)
    }
    const group = byProduct.get(key)
    group.batches.push(b)
    group.total += qtyOf(b)
    const w = warehouseOf(b)
    group.perWarehouse[w] = (group.perWarehouse[w] || 0) + qtyOf(b)
  }
  groups.sort((a, b) => (a.product?.name || '').localeCompare(b.product?.name || ''))

  // FIFO within each product: soonest-to-expire first, batches with no
  // expiry treated as "never expires" and shown last — same order
  // StockService::deduct already sells from, so this screen always shows
  // staff which batch should be sold/moved out first.
  for (const g of groups) {
    g.batches.sort((a, b) => {
      const aDate = a.best_before ? new Date(a.best_before).getTime() : Infinity
      const bDate = b.best_before ? new Date(b.best_before).getTime() : Infinity
      if (aDate !== bDate) return aDate - bDate
      return (a.id ?? 0) - (b.id ?? 0)
    })
  }

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  const colCount = 3 + columns.length

  if (loading) return <p className="text-sm text-ink-soft">Loading stock batches…</p>

  return (
    <div>
      {/* Per-warehouse totals */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((w) => (
          <div key={w} className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-ink-soft">{w}</p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">
              {warehouseTotals[w] || 0}
            </p>
            <p className="text-xs text-ink-soft">units in stock</p>
          </div>
        ))}
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-brand-600">All warehouses</p>
          <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-brand-700">
            {grandTotal}
          </p>
          <p className="text-xs text-brand-600">total units</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-brand-500"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm focus:border-brand-500"
          >
            <option value="All">All warehouses</option>
            {columns.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            disabled={products.length === 0}
            className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
          >
            + Add stock batch
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Total Stock</th>
              {columns.map((w) => (
                <th key={w} className="px-4 py-3 text-right">
                  {w}
                </th>
              ))}
              <th className="px-4 py-3 text-right">Batches</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isOpen = !!expanded[g.key]
              return (
                <Fragment key={g.key}>
                  <tr
                    onClick={() => toggle(g.key)}
                    className="cursor-pointer border-b border-border last:border-0 hover:bg-canvas"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      <span className="inline-flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-3.5 w-3.5 text-ink-soft transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                        {g.product?.name}
                        {g.product?.weight ? (
                          <span className="text-xs font-normal text-ink-soft">
                            — {g.product.weight}g
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-ink">
                      {g.total}
                      {g.total <= LOW_STOCK_THRESHOLD && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700">
                          Low
                        </span>
                      )}
                    </td>
                    {columns.map((w) => (
                      <td key={w} className="px-4 py-3 text-right tabular-nums text-ink-soft">
                        {g.perWarehouse[w] ? (
                          <span className="text-ink">{g.perWarehouse[w]}</span>
                        ) : (
                          '—'
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right tabular-nums text-ink-soft">
                      {g.batches.length}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="border-b border-border last:border-0 bg-canvas/60">
                      <td colSpan={colCount} className="px-4 py-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
                              <th className="px-2 py-2">Batch No.</th>
                              <th className="px-2 py-2">Warehouse</th>
                              <th className="px-2 py-2 text-right">Quantity</th>
                              <th className="px-2 py-2">Best Before</th>
                              <th className="px-2 py-2">Barcodes</th>
                              {isAdmin && <th className="px-2 py-2"></th>}
                            </tr>
                          </thead>
                          <tbody>
                            {g.batches.map((b, idx) => {
                              const nearExpiry = isNearExpiry(b.best_before)
                              const sellFirst = idx === 0 && g.batches.length > 1
                              return (
                                <tr
                                  key={b.id}
                                  className={`border-t border-border ${
                                    nearExpiry ? 'bg-danger-50/40' : ''
                                  }`}
                                >
                                  <td className="px-2 py-2">
                                    <span className="inline-flex items-center rounded-md bg-surface px-2 py-1 font-mono text-xs text-ink-soft">
                                      {b.batch_no}
                                    </span>
                                    {sellFirst && (
                                      <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                        Sell first · FIFO
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2">
                                    <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-ink-soft">
                                      {warehouseOf(b)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums text-ink">
                                    {qtyOf(b)}
                                  </td>
                                  <td className="px-2 py-2">
                                    {b.best_before ? (
                                      <span
                                        className={
                                          nearExpiry
                                            ? 'inline-flex items-center gap-1.5 rounded-full bg-danger-100 px-2 py-0.5 text-xs font-medium text-danger-700'
                                            : 'text-ink'
                                        }
                                      >
                                        {nearExpiry && (
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="currentColor"
                                            className="h-3 w-3"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                        {b.best_before}
                                      </span>
                                    ) : (
                                      <span className="text-ink-soft">—</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={
                                        b.printed
                                          ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600'
                                          : 'inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                                      }
                                    >
                                      <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          b.printed ? 'bg-brand-500' : 'bg-alert-500'
                                        }`}
                                      />
                                      {b.printed ? 'Printed' : 'Not printed'}
                                    </span>
                                  </td>
                                  {isAdmin && (
                                    <td className="px-2 py-2 text-right whitespace-nowrap">
                                      {b.printed ? (
                                        <div className="flex flex-col items-end gap-0.5">
                                          <button
                                            disabled
                                            title="Already printed — for security, reprinting needs confirmation."
                                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink-soft opacity-70"
                                          >
                                            Printed
                                          </button>
                                          <button
                                            onClick={() => setReprintConfirmBatch(b)}
                                            className="text-[11px] text-ink-soft underline hover:text-brand-600"
                                          >
                                            Reprint anyway
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setPrintingBatch(b)}
                                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
                                        >
                                          Print
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {groups.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-8 text-center text-ink-soft">
                  {batches.length === 0
                    ? 'No stock batches yet.'
                    : categoryFilter !== 'All' && warehouseFilter !== 'All'
                    ? `No ${categoryFilter} stock in ${warehouseFilter}.`
                    : categoryFilter !== 'All'
                    ? `No ${categoryFilter} stock.`
                    : `No stock in ${warehouseFilter}.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Add stock batch" onClose={() => setModalOpen(false)}>
          <StockBatchForm
            products={products}
            saving={saving}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}

      {printingBatch && (
        <PrintBarcodesModal
          batch={printingBatch}
          product={printingBatch.product}
          reprintReason={reprintReason}
          onClose={() => {
            setPrintingBatch(null)
            setReprintReason('')
          }}
          onPrinted={() => {
            setPrintingBatch(null)
            setReprintReason('')
            load()
          }}
        />
      )}

      {reprintConfirmBatch && (
        <Modal
          title="Reprint barcode?"
          onClose={() => {
            setReprintConfirmBatch(null)
            setReprintReasonInput('')
          }}
        >
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{reprintConfirmBatch.batch_no}</strong> was already printed.
            Reprinting can create duplicate barcode labels for the same batch — only do this if the
            original label was lost, damaged, or misprinted.
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            This will be recorded under your account
            {currentUser?.name || currentUser?.email ? (
              <>
                {' '}
                (<strong className="text-ink">{currentUser?.name || currentUser?.email}</strong>)
              </>
            ) : null}
            .
          </p>
          <div className="mt-3">
            <label className="block text-sm font-medium text-ink mb-1">
              Reason for reprint (required)
            </label>
            <textarea
              value={reprintReasonInput}
              onChange={(e) => setReprintReasonInput(e.target.value)}
              rows={2}
              placeholder="e.g. Original label was damaged during transfer"
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
            />
            <p className="mt-1 text-xs text-ink-soft">
              This gets saved with the batch so there's a record of who reprinted it and why.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setReprintConfirmBatch(null)
                setReprintReasonInput('')
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setReprintReason(reprintReasonInput.trim())
                setPrintingBatch(reprintConfirmBatch)
                setReprintConfirmBatch(null)
                setReprintReasonInput('')
              }}
              disabled={!reprintReasonInput.trim()}
              className="rounded-md bg-danger-500 hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              Yes, reprint anyway
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// --- Transfer Log (stock temporarily moved out to events/bazaars) ---
function TransferLogTab({ isAdmin }) {
  const [movements, setMovements] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [returnMovement, setReturnMovement] = useState(null)
  const [returnQtyInput, setReturnQtyInput] = useState('')
  const [returningId, setReturningId] = useState(null)

  const [loadError, setLoadError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    Promise.allSettled([getStockMovements(), getStockBatches()]).then(([mResult, bResult]) => {
      if (mResult.status === 'fulfilled') {
        setMovements(mResult.value)
      } else {
        setLoadError(
          'Could not load stock movements — make sure the migration has been run and the /admin/stock-movements routes are added.'
        )
      }
      if (bResult.status === 'fulfilled') {
        setBatches(bResult.value)
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(payload) {
    setSaving(true)
    try {
      await createStockMovement(payload)
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  // How much of a movement is still out (not yet returned to the origin
  // warehouse). Falls back to the whole quantity for movements saved
  // before partial returns existed (no quantity_returned field yet).
  const returnedQtyOf = (m) => Number(m.quantity_returned) || 0
  const remainingQtyOf = (m) => Math.max(Number(m.quantity) - returnedQtyOf(m), 0)

  async function handleConfirmReturn() {
    if (!returnMovement) return
    const qty = Number(returnQtyInput)
    if (!qty || qty <= 0) return
    setReturningId(returnMovement.id)
    try {
      await markMovementReturned(returnMovement.id, { quantity_returned: qty })
      setReturnMovement(null)
      setReturnQtyInput('')
      load()
    } finally {
      setReturningId(null)
    }
  }

  if (loading) return <p className="text-ink-soft">Loading…</p>

  return (
    <div>
      {loadError && (
        <div className="mb-4 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {loadError}
        </div>
      )}

      <div className="mb-4 flex items-center justify-end">
        {isAdmin && (
          <button
            onClick={() => setModalOpen(true)}
            className="shrink-0 rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Log movement
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Photo</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Batch No.</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Status</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => {
              const returnedQty = returnedQtyOf(m)
              const remainingQty = remainingQtyOf(m)
              const isFullyReturned = !!m.returned_at || remainingQty <= 0
              const isPartiallyReturned = !isFullyReturned && returnedQty > 0
              return (
                <tr key={m.id} className="border-b border-border last:border-0 hover:bg-canvas">
                  <td className="px-4 py-3">
                    {m.photo_path ? (
                      <button
                        onClick={() => setLightbox(m.photo_path)}
                        className="block h-10 w-10 overflow-hidden rounded-md border border-border"
                      >
                        <img src={m.photo_path} alt="" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">{m.stock_batch?.product?.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-canvas px-2 py-1 font-mono text-xs text-ink-soft">
                      {m.stock_batch?.batch_no}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">
                    {m.quantity}
                    {returnedQty > 0 && (
                      <span className="ml-1.5 text-xs text-ink-soft">
                        ({returnedQty} returned{remainingQty > 0 ? `, ${remainingQty} out` : ''})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink">{m.destination}</td>
                  <td className="px-4 py-3 text-ink-soft">{m.moved_at}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        isFullyReturned
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600'
                          : isPartiallyReturned
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700'
                          : 'inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                      }
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isFullyReturned ? 'bg-brand-500' : isPartiallyReturned ? 'bg-amber-500' : 'bg-alert-500'
                        }`}
                      />
                      {isFullyReturned
                        ? `Returned${m.returned_at ? ` ${m.returned_at}` : ''}`
                        : isPartiallyReturned
                        ? 'Partially returned'
                        : 'Out'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {!isFullyReturned && (
                        <button
                          onClick={() => {
                            setReturnMovement(m)
                            setReturnQtyInput(String(remainingQty))
                          }}
                          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
                        >
                          Log return
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
            {movements.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-ink-soft">
                  No stock movements logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title="Log stock movement" onClose={() => setModalOpen(false)}>
          <StockMovementForm
            batches={batches}
            onSubmit={handleSubmit}
            onCancel={() => setModalOpen(false)}
            saving={saving}
          />
        </Modal>
      )}

      {returnMovement && (
        <Modal
          title="Log return"
          onClose={() => {
            setReturnMovement(null)
            setReturnQtyInput('')
          }}
        >
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{returnMovement.quantity}</strong> units of{' '}
            <strong className="text-ink">{returnMovement.stock_batch?.product?.name}</strong> (batch{' '}
            {returnMovement.stock_batch?.batch_no}) were moved to{' '}
            <strong className="text-ink">{returnMovement.destination}</strong>. How many are being
            returned to the origin warehouse now?
          </p>
          <div className="mt-3">
            <label className="block text-sm font-medium text-ink mb-1">Quantity being returned</label>
            <input
              type="number"
              min="1"
              max={remainingQtyOf(returnMovement)}
              value={returnQtyInput}
              onChange={(e) => setReturnQtyInput(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
            />
            <p className="mt-1 text-xs text-ink-soft">
              Up to {remainingQtyOf(returnMovement)} still out. Leave it lower if only some of the
              stock is coming back — you can log another return later for the rest.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setReturnMovement(null)
                setReturnQtyInput('')
              }}
              className="rounded-md border border-border px-4 py-2 text-sm text-ink-soft hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReturn}
              disabled={
                returningId === returnMovement.id ||
                !returnQtyInput ||
                Number(returnQtyInput) <= 0 ||
                Number(returnQtyInput) > remainingQtyOf(returnMovement)
              }
              className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white"
            >
              {returningId === returnMovement.id ? 'Saving…' : 'Confirm return'}
            </button>
          </div>
        </Modal>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <img
            src={lightbox}
            alt="Transfer proof"
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </div>
  )
}

// --- Supplies ---
function SuppliesTab({ isAdmin }) {
  const [supplies, setSupplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getSupplies()
      .then(setSupplies)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(formData) {
    setSaving(true)
    try {
      if (editing) {
        await updateSupply(editing.id, formData)
      } else {
        await createSupply(formData)
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(supply) {
    if (!confirm(`Delete "${supply.name}"?`)) return
    await deleteSupply(supply.id)
    load()
  }

  if (loading) return <p className="text-sm text-ink-soft">Loading supplies…</p>

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            className="rounded-md bg-brand-500 hover:bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            + Add supply
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Unit</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {supplies.map((s) => {
              const low = s.reorder_level != null && s.stock_quantity <= s.reorder_level
              return (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{s.category || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        low
                          ? 'inline-flex items-center gap-1 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                          : 'text-ink'
                      }
                    >
                      {s.stock_quantity}
                      {low && ' · Reorder'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{s.unit}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditing(s)
                          setModalOpen(true)
                        }}
                        className="text-brand-600 hover:underline text-xs mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-danger-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {supplies.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-ink-soft">
                  No supplies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <Modal title={editing ? 'Edit supply' : 'Add supply'} onClose={() => setModalOpen(false)}>
          <SupplyForm
            initial={editing}
            saving={saving}
            onCancel={() => setModalOpen(false)}
            onSubmit={handleSubmit}
          />
        </Modal>
      )}
    </div>
  )
}

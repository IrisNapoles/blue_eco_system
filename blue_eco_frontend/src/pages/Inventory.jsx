import { useState, useEffect, useCallback } from 'react'
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
        {tab === 'Stock Batches' && <StockBatchesTab isAdmin={isAdmin} />}
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

// --- Stock Batches ---
function StockBatchesTab({ isAdmin }) {
  const [batches, setBatches] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [printingBatch, setPrintingBatch] = useState(null)

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

  if (loading) return <p className="text-sm text-ink-soft">Loading stock batches…</p>

  return (
    <div>
      {isAdmin && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setModalOpen(true)}
            disabled={products.length === 0}
            className="rounded-md bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
          >
            + Add stock batch
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Batch No.</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Warehouse</th>
              <th className="px-4 py-3">Best Before</th>
              <th className="px-4 py-3">Barcodes</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const nearExpiry = isNearExpiry(b.best_before)
              return (
                <tr
                  key={b.id}
                  className={`border-b border-border last:border-0 transition-colors ${
                    nearExpiry ? 'bg-danger-50/40 hover:bg-danger-50/70' : 'hover:bg-canvas'
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-ink">{b.product?.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-canvas px-2 py-1 font-mono text-xs text-ink-soft">
                      {b.batch_no}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink">{b.quantity}</td>
                  <td className="px-4 py-3">
                    {b.warehouse ? (
                      <span className="inline-flex items-center rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-soft">
                        {b.warehouse}
                      </span>
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <span
                      className={
                        b.printed
                          ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600'
                          : 'inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                      }
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${b.printed ? 'bg-brand-500' : 'bg-alert-500'}`}
                      />
                      {b.printed ? 'Printed' : 'Not printed'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setPrintingBatch(b)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
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
                            d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z"
                          />
                        </svg>
                        {b.printed ? 'Reprint' : 'Print'}
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-ink-soft">
                  No stock batches yet.
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
          onClose={() => setPrintingBatch(null)}
          onPrinted={() => {
            setPrintingBatch(null)
            load()
          }}
        />
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

  async function handleMarkReturned(id) {
    await markMovementReturned(id)
    load()
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
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-canvas">
                <td className="px-4 py-3 font-medium text-ink">{m.stock_batch?.product?.name}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-md bg-canvas px-2 py-1 font-mono text-xs text-ink-soft">
                    {m.stock_batch?.batch_no}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-ink">{m.quantity}</td>
                <td className="px-4 py-3 text-ink">{m.destination}</td>
                <td className="px-4 py-3 text-ink-soft">{m.moved_at}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      m.returned_at
                        ? 'inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600'
                        : 'inline-flex items-center gap-1.5 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                    }
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${m.returned_at ? 'bg-brand-500' : 'bg-alert-500'}`}
                    />
                    {m.returned_at ? `Returned ${m.returned_at}` : 'Out'}
                  </span>
                </td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!m.returned_at && (
                      <button
                        onClick={() => handleMarkReturned(m.id)}
                        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-canvas"
                      >
                        Mark returned
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {movements.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-ink-soft">
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

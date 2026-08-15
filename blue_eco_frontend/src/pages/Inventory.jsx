import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import ProductForm from '../components/ProductForm'
import StockBatchForm from '../components/StockBatchForm'
import SupplyForm from '../components/SupplyForm'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getStockBatches,
  createStockBatch,
  getSupplies,
  createSupply,
  updateSupply,
  deleteSupply,
  LOW_STOCK_THRESHOLD,
  NEAR_EXPIRY_DAYS,
} from '../lib/inventoryApi'

const TABS = ['Products', 'Stock Batches', 'Supplies']

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

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              {isAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.stock_quantity <= LOW_STOCK_THRESHOLD
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{p.sku}</td>
                  <td className="px-4 py-3">₱{Number(p.price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        low
                          ? 'inline-flex items-center gap-1 rounded-full bg-alert-50 px-2 py-0.5 text-xs font-medium text-alert-700'
                          : 'text-ink'
                      }
                    >
                      {p.stock_quantity}
                      {low && ' · Low'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setEditing(p)
                          setModalOpen(true)
                        }}
                        className="text-brand-600 hover:underline text-xs mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="text-danger-500 hover:underline text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-4 py-8 text-center text-ink-soft">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const nearExpiry = isNearExpiry(b.best_before)
              return (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{b.product?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-soft">{b.batch_no}</td>
                  <td className="px-4 py-3">{b.quantity}</td>
                  <td className="px-4 py-3">{b.warehouse || '—'}</td>
                  <td className="px-4 py-3">
                    {b.best_before ? (
                      <span
                        className={
                          nearExpiry
                            ? 'inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-xs font-medium text-danger-700'
                            : ''
                        }
                      >
                        {b.best_before}
                        {nearExpiry && ' · Expiring soon'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
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

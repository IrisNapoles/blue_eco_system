import { useState, useEffect, useRef } from 'react'
import { getNextBatchNumber, WAREHOUSES } from '../lib/inventoryApi'

const OTHERS_WAREHOUSE = '__others__'

function ProductThumb({ src, size = 'h-9 w-9', rounded = 'rounded-md', iconSize = 'h-4 w-4' }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-border bg-canvas`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`${iconSize} text-ink-soft opacity-40`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18M3 19.5h18M4.5 4.5v15m15-15v15"
          />
        </svg>
      )}
    </span>
  )
}

export default function StockBatchForm({ products, onSubmit, onCancel, saving }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [productListOpen, setProductListOpen] = useState(false)
  const [openProductFamilies, setOpenProductFamilies] = useState(new Set())
  const productDropdownRef = useRef(null)
  const [batchNo, setBatchNo] = useState('')
  const [quantity, setQuantity] = useState('')
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0])
  const [customWarehouse, setCustomWarehouse] = useState('')
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setProductListOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleProductFamily(key) {
    setOpenProductFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function pluralize(word) {
    if (!word) return word
    return word.toLowerCase().endsWith('s') ? word : `${word}s`
  }

  // Group products by their form (Tablet, Capsule, Powder…) so the picker
  // can show categories instead of one long flat list — same pattern as
  // the batch picker in the log-movement form.
  const productFamilies = []
  const familyByKey = new Map()
  for (const p of products) {
    const familyKey = p.form || p.name || 'Other'
    if (!familyByKey.has(familyKey)) {
      const fam = { key: familyKey, items: [] }
      familyByKey.set(familyKey, fam)
      productFamilies.push(fam)
    }
    familyByKey.get(familyKey).items.push(p)
  }

  const selectedProduct = products.find((p) => p.id == productId) || null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!productId) {
      setErrors({ product_id: ['Please select a product.'] })
      return
    }
    try {
      const resolvedWarehouse =
        warehouse === OTHERS_WAREHOUSE ? customWarehouse.trim() : warehouse
      await onSubmit({
        product_id: productId,
        batch_no: batchNo,
        quantity: Number(quantity),
        warehouse: resolvedWarehouse || null,
        best_before: bestBefore,
      })
    } catch (err) {
      setErrors(err.response?.data?.errors || {})
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative" ref={productDropdownRef}>
        <label className="block text-sm font-medium text-ink mb-1">Product</label>
        <button
          type="button"
          onClick={() => setProductListOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm outline-none ${
            productListOpen ? 'border-brand-500' : 'border-border'
          }`}
        >
          <ProductThumb src={selectedProduct?.image_path} size="h-9 w-9" />
          <span className="min-w-0 flex-1">
            {productListOpen ? (
              <span className="text-ink-soft">
                {selectedProduct ? 'Choose a different product…' : 'Select a product'}
              </span>
            ) : selectedProduct ? (
              <>
                <span className="flex min-w-0 items-baseline gap-1">
                  <span className="min-w-0 truncate text-ink">{selectedProduct.name}</span>
                  {selectedProduct.weight ? (
                    <span className="shrink-0 text-ink">{Number(selectedProduct.weight)}g</span>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-ink-soft">{selectedProduct.sku}</span>
              </>
            ) : (
              <span className="text-ink-soft">Select a product</span>
            )}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
              productListOpen ? 'rotate-180' : ''
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {productListOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-lg">
            <ul className="max-h-64 overflow-y-auto text-sm">
              {productFamilies.map((fam) => {
                const isOpen = openProductFamilies.has(fam.key)
                return (
                  <li key={fam.key} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => toggleProductFamily(fam.key)}
                      className="flex w-full items-center gap-2 bg-canvas/70 px-3 py-2 text-left hover:bg-canvas"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
                          isOpen ? 'rotate-90' : ''
                        }`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">
                        {pluralize(fam.key)}
                        <span className="ml-1 font-normal text-ink-soft">
                          · {fam.items.length} product{fam.items.length === 1 ? '' : 's'}
                        </span>
                      </span>
                    </button>

                    {isOpen && (
                      <ul>
                        {fam.items.map((p) => (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setProductId(p.id)
                                setProductListOpen(false)
                              }}
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas ${
                                p.id == productId ? 'bg-brand-50' : ''
                              }`}
                            >
                              <ProductThumb src={p.image_path} size="h-10 w-10" />
                              <span className="min-w-0 flex-1">
                                <span className="flex min-w-0 items-baseline gap-1">
                                  <span className="min-w-0 truncate text-xs font-semibold text-ink">
                                    {p.name}
                                  </span>
                                  {p.weight ? (
                                    <span className="shrink-0 text-xs font-semibold text-ink">
                                      {Number(p.weight)}g
                                    </span>
                                  ) : null}
                                </span>
                                <span className="block truncate text-xs text-ink-soft">{p.sku}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {errors.product_id && <p className="mt-1 text-xs text-danger-500">{errors.product_id[0]}</p>}
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
          <select
            value={warehouse}
            onChange={(e) => setWarehouse(e.target.value)}
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          >
            {WAREHOUSES.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
            <option value={OTHERS_WAREHOUSE}>Others (please specify)</option>
          </select>
          {errors.warehouse && (
            <p className="mt-1 text-xs text-danger-500">{errors.warehouse[0]}</p>
          )}
        </div>
      </div>

      {warehouse === OTHERS_WAREHOUSE && (
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Warehouse name</label>
          <input
            type="text"
            value={customWarehouse}
            onChange={(e) => setCustomWarehouse(e.target.value)}
            required
            placeholder="Enter warehouse name"
            className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink mb-1">Best before</label>
        <input
          type="date"
          value={bestBefore}
          onChange={(e) => setBestBefore(e.target.value)}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        />
        {errors.best_before && (
          <p className="mt-1 text-xs text-danger-500">{errors.best_before[0]}</p>
        )}
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

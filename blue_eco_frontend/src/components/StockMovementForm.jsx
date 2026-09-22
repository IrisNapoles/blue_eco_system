import { useState, useRef, useEffect } from 'react'
import { WAREHOUSES, normalizeWarehouse } from '../lib/inventoryApi'

const today = () => new Date().toISOString().slice(0, 10)

// Preset destinations. "Other" lets the user type a custom one.
export const DESTINATION_OPTIONS = WAREHOUSES
const OTHER = '__other__'

export default function StockMovementForm({ batches, onSubmit, onCancel, saving }) {
  const [batchId, setBatchId] = useState(batches[0]?.id || '')
  const [quantity, setQuantity] = useState('')
  const [destinationChoice, setDestinationChoice] = useState(DESTINATION_OPTIONS[0])
  const [customDestination, setCustomDestination] = useState('')
  const [movedAt, setMovedAt] = useState(today())
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [errors, setErrors] = useState({})
  const [batchListOpen, setBatchListOpen] = useState(false)
  const [batchViewMode, setBatchViewMode] = useState('list')
  const [batchWarehouseFilter, setBatchWarehouseFilter] = useState('All')
  const [openFamilies, setOpenFamilies] = useState(new Set())
  const [openBatchInfo, setOpenBatchInfo] = useState(new Set())
  const batchDropdownRef = useRef(null)

  function toggleFamily(key) {
    setOpenFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleBatchInfo(id) {
    setOpenBatchInfo((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function pluralize(word) {
    if (!word) return word
    return word.toLowerCase().endsWith('s') ? word : `${word}s`
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (batchDropdownRef.current && !batchDropdownRef.current.contains(e.target)) {
        setBatchListOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedBatch = batches.find((b) => b.id == batchId)
  const isOther = destinationChoice === OTHER
  const destination = isOther ? customDestination.trim() : destinationChoice
  const visibleBatches =
    batchWarehouseFilter === 'All'
      ? batches
      : batches.filter((b) => normalizeWarehouse(b.warehouse) === batchWarehouseFilter)
  const batchWarehouseOptions = [
    ...WAREHOUSES,
    ...[...new Set(batches.map((b) => normalizeWarehouse(b.warehouse)))].filter(
      (w) => !WAREHOUSES.includes(w)
    ),
  ]

  // Per-product totals per warehouse — computed from ALL batches (ignoring the
  // warehouse filter) so the Farm-vs-Parañaque breakdown is always visible,
  // even while the list itself is filtered down to one warehouse. Movements
  // now literally create/shrink real batch rows per warehouse, so raw
  // quantity here is already accurate — no separate "available" figure
  // needed.
  const productKey = (b) => b.product?.id ?? `name:${b.product?.name}`
  const warehouseTotalsByProduct = {}
  for (const b of batches) {
    const key = productKey(b)
    const w = normalizeWarehouse(b.warehouse)
    warehouseTotalsByProduct[key] = warehouseTotalsByProduct[key] || {}
    warehouseTotalsByProduct[key][w] = (warehouseTotalsByProduct[key][w] || 0) + (Number(b.quantity) || 0)
  }

  // Group the (filtered) batches by product, preserving first-seen order,
  // then sort each group FIFO-style (soonest-expiring / oldest batch first)
  // so the picker can point people at the batch they should move first.
  const batchGroups = []
  const groupByKey = new Map()
  for (const b of visibleBatches) {
    const key = productKey(b)
    if (!groupByKey.has(key)) {
      const group = { key, product: b.product, batches: [] }
      groupByKey.set(key, group)
      batchGroups.push(group)
    }
    groupByKey.get(key).batches.push(b)
  }
  for (const g of batchGroups) {
    g.batches.sort((a, b) => {
      const aDate = a.best_before ? new Date(a.best_before).getTime() : Infinity
      const bDate = b.best_before ? new Date(b.best_before).getTime() : Infinity
      if (aDate !== bDate) return aDate - bDate
      return (a.id ?? 0) - (b.id ?? 0)
    })
  }

  // Enrich each product group with its warehouse totals + grand total, then
  // fold groups into "families" by product form (Tablet, Capsule, Powder…)
  // so different weight variants of the same form can be tucked under one
  // expandable row instead of listed flat.
  const enrichedGroups = batchGroups.map((g) => {
    const totals = warehouseTotalsByProduct[g.key] || {}
    const totalsWarehouses = [
      ...WAREHOUSES,
      ...Object.keys(totals).filter((w) => !WAREHOUSES.includes(w)),
    ]
    const groupTotal = Object.values(totals).reduce((sum, n) => sum + (Number(n) || 0), 0)
    return { ...g, totals, totalsWarehouses, groupTotal }
  })

  const batchFamilies = []
  const familyByKey = new Map()
  for (const g of enrichedGroups) {
    const familyKey = g.product?.form || g.product?.name || 'Other'
    if (!familyByKey.has(familyKey)) {
      const fam = { key: familyKey, groups: [], total: 0 }
      familyByKey.set(familyKey, fam)
      batchFamilies.push(fam)
    }
    const fam = familyByKey.get(familyKey)
    fam.groups.push(g)
    fam.total += g.groupTotal
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0] || null
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})

    if (!batchId) {
      setErrors({ stock_batch_id: ['Please select a batch.'] })
      return
    }

    if (isOther && !destination) {
      setErrors({ destination: ['Please specify the destination.'] })
      return
    }

    const formData = new FormData()
    formData.append('stock_batch_id', batchId)
    formData.append('quantity', Number(quantity))
    formData.append('destination', destination)
    formData.append('moved_at', movedAt)
    if (notes) formData.append('notes', notes)
    if (photo) formData.append('photo', photo)

    try {
      await onSubmit(formData)
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
      <div ref={batchDropdownRef} className="relative">
        <label className="block text-sm font-medium text-ink mb-1">Batch</label>
        <button
          type="button"
          onClick={() => setBatchListOpen((v) => !v)}
          className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm outline-none ${
            batchListOpen ? 'border-brand-500' : 'border-border'
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-canvas">
            <BatchThumb src={selectedBatch?.product?.image_path} size="h-9 w-9" bare />
          </span>
          <span className="min-w-0 flex-1">
            {batchListOpen ? (
              <span className="text-ink-soft">
                {selectedBatch ? 'Choose a different batch…' : 'Select a batch'}
              </span>
            ) : selectedBatch ? (
              <>
                <span className="block truncate text-ink">
                  {selectedBatch.product?.name}
                  {selectedBatch.product?.weight ? ` ${Number(selectedBatch.product.weight)}g` : ''}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {selectedBatch.batch_no} · {normalizeWarehouse(selectedBatch.warehouse)}
                </span>
              </>
            ) : (
              <span className="text-ink-soft">Select a batch</span>
            )}
          </span>
          {selectedBatch && !batchListOpen && (
            <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
              {selectedBatch.quantity} in stock
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
              batchListOpen ? 'rotate-180' : ''
            }`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {batchListOpen && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-border bg-white shadow-lg">
            <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              <span className="px-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
                {visibleBatches.length} batch{visibleBatches.length === 1 ? '' : 'es'}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={batchWarehouseFilter}
                  onChange={(e) => setBatchWarehouseFilter(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md border border-border bg-white px-2 py-1 text-xs text-ink-soft focus:border-brand-500"
                >
                  <option value="All">All warehouses</option>
                  {batchWarehouseOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <button
                  type="button"
                  onClick={() => setBatchViewMode('list')}
                  aria-label="List view"
                  className={`rounded p-1 ${
                    batchViewMode === 'list' ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-canvas'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setBatchViewMode('grid')}
                  aria-label="Grid view"
                  className={`rounded p-1 ${
                    batchViewMode === 'grid' ? 'bg-brand-50 text-brand-600' : 'text-ink-soft hover:bg-canvas'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 4.5h6v6h-6v-6zM14.25 4.5h6v6h-6v-6zM3.75 13.5h6v6h-6v-6zM14.25 13.5h6v6h-6v-6z"
                    />
                  </svg>
                </button>
                </div>
              </div>
            </div>

            {visibleBatches.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink-soft">
                {batches.length === 0 ? 'No batches available.' : `No batches in ${batchWarehouseFilter}.`}
              </p>
            ) : batchViewMode === 'list' ? (
              <ul className="max-h-64 overflow-y-auto text-sm">
                {batchFamilies.map((fam) => {
                  const isOpen = openFamilies.has(fam.key)

                  const renderRow = (g) => (
                    <li key={g.key}>
                      <ul>
                        {g.batches.map((b) => (
                          <li key={b.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setBatchId(b.id)
                                setBatchListOpen(false)
                              }}
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas ${
                                b.id == batchId ? 'bg-brand-50' : ''
                              }`}
                            >
                              <BatchThumb src={b.product?.image_path} size="h-10 w-10" />
                              <span className="min-w-0 max-w-[40%]">
                                <span className="flex min-w-0 items-baseline gap-1">
                                  <span className="min-w-0 truncate text-xs font-semibold text-ink">
                                    {g.product?.name}
                                  </span>
                                  {g.product?.weight ? (
                                    <span className="shrink-0 text-xs font-semibold text-ink">
                                      {Number(g.product.weight)}g
                                    </span>
                                  ) : null}
                                </span>
                                <span className="flex min-w-0 items-center gap-1">
                                  <span className="min-w-0 truncate text-xs text-ink-soft">{b.batch_no}</span>
                                  {g.batches.length > 1 && g.batches[0]?.id === b.id ? (
                                    <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
                                      Move first
                                    </span>
                                  ) : null}
                                </span>
                              </span>
                              <span className="ml-auto flex shrink-0 flex-col items-end gap-1">
                                <span className="flex items-baseline gap-1 rounded-full bg-brand-500 px-2.5 py-1 leading-none text-white">
                                  <span className="text-sm font-bold">{g.groupTotal}</span>
                                  <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90">
                                    total
                                  </span>
                                </span>
                                <span className="flex flex-wrap items-center justify-end gap-1">
                                  {g.totalsWarehouses.map((w) => (
                                    <span
                                      key={w}
                                      className="rounded-full border border-border bg-white px-1.5 py-0.5 text-[10px] text-ink-soft"
                                    >
                                      {w}: <strong className="text-ink">{g.totals[w] || 0}</strong>
                                    </span>
                                  ))}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </li>
                  )

                  return (
                    <li key={fam.key} className="border-b border-border last:border-0">
                      <button
                        type="button"
                        onClick={() => toggleFamily(fam.key)}
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
                            · {fam.groups.length} product{fam.groups.length === 1 ? '' : 's'}
                          </span>
                        </span>
                        <span className="ml-auto shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-sm font-bold leading-none text-white">
                          {fam.total}
                        </span>
                      </button>
                      {isOpen && <ul>{fam.groups.map(renderRow)}</ul>}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="flex max-h-72 flex-col gap-1 overflow-y-auto p-2">
                {batchFamilies.map((fam) => {
                  const isOpen = openFamilies.has(fam.key)
                  return (
                    <div key={fam.key}>
                      <button
                        type="button"
                        onClick={() => toggleFamily(fam.key)}
                        className="flex w-full items-center gap-2 rounded-md bg-canvas/70 px-3 py-2 text-left hover:bg-canvas"
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
                            · {fam.groups.length} product{fam.groups.length === 1 ? '' : 's'}
                          </span>
                        </span>
                        <span className="ml-auto shrink-0 rounded-full bg-brand-500 px-2.5 py-1 text-sm font-bold leading-none text-white">
                          {fam.total}
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {fam.groups.map((g) =>
                            g.batches.map((b) => {
                              const infoOpen = openBatchInfo.has(b.id)
                              return (
                                <div
                                  key={b.id}
                                  className={`rounded-md border p-2 ${
                                    b.id == batchId ? 'border-brand-500 bg-brand-50' : 'border-transparent'
                                  } hover:bg-canvas`}
                                >
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setBatchId(b.id)
                                        setBatchListOpen(false)
                                      }}
                                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                    >
                                      <span className="relative shrink-0">
                                        <BatchThumb
                                          src={b.product?.image_path}
                                          size="h-12 w-12"
                                          rounded="rounded-md"
                                          iconSize="h-5 w-5"
                                        />
                                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
                                          {g.groupTotal}
                                        </span>
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="flex min-w-0 items-baseline gap-1">
                                          <span className="min-w-0 truncate text-xs font-semibold text-ink">
                                            {b.product?.name}
                                          </span>
                                          {b.product?.weight ? (
                                            <span className="shrink-0 text-xs font-semibold text-ink">
                                              {Number(b.product.weight)}g
                                            </span>
                                          ) : null}
                                        </span>
                                        <span className="flex min-w-0 items-center gap-1">
                                          <span className="min-w-0 truncate text-[10px] text-ink-soft">
                                            {b.batch_no}
                                          </span>
                                          {g.batches.length > 1 && g.batches[0]?.id === b.id ? (
                                            <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700">
                                              1st
                                            </span>
                                          ) : null}
                                        </span>
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => toggleBatchInfo(b.id)}
                                      aria-label="Show stock per warehouse"
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-ink-soft hover:text-brand-600 ${
                                        infoOpen ? 'border-brand-500 text-brand-600' : 'border-border'
                                      }`}
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-3.5 w-3.5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                                        />
                                      </svg>
                                    </button>
                                  </div>

                                  {infoOpen && (
                                    <div className="mt-2 space-y-0.5 rounded-md bg-canvas px-2 py-1.5">
                                      {g.totalsWarehouses.map((w) => (
                                        <div
                                          key={w}
                                          className="flex items-center justify-between gap-2 text-[10px] text-ink-soft"
                                        >
                                          <span className="truncate">{w}</span>
                                          <span className="font-bold text-ink">{g.totals[w] || 0}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

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
            max={selectedBatch ? selectedBatch.quantity : undefined}
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
        <select
          value={destinationChoice}
          onChange={(e) => {
            setDestinationChoice(e.target.value)
            setErrors((prev) => ({ ...prev, destination: undefined }))
          }}
          required
          className="w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
        >
          {DESTINATION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={OTHER}>Others (please specify)</option>
        </select>

        {isOther && (
          <input
            value={customDestination}
            onChange={(e) => setCustomDestination(e.target.value)}
            placeholder="Specify destination — e.g. SM Southmall Bazaar"
            autoFocus
            required
            className="mt-2 w-full rounded-md border border-border px-3 py-2 text-sm focus:border-brand-500"
          />
        )}

        {errors.destination && <p className="mt-1 text-xs text-danger-500">{errors.destination[0]}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">Photo (optional)</label>
        <div className="flex w-full flex-col items-end gap-3">
          <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-soft">
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-10 w-10 text-ink-soft opacity-40"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 4.5h18M3 19.5h18M4.5 4.5v15m15-15v15"
                />
              </svg>
            )}
          </div>
          <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-canvas">
            {photoPreview ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        </div>
        <p className="mt-1 text-xs text-ink-soft">Proof of the batch being moved out — optional.</p>
        {errors.photo && <p className="mt-1 text-xs text-danger-500">{errors.photo[0]}</p>}
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

function BatchThumb({ src, size = 'h-9 w-9', rounded = 'rounded-md', bare = false, iconSize = 'h-4 w-4' }) {
  const wrapperClasses = bare
    ? `flex ${size} items-center justify-center overflow-hidden`
    : `flex ${size} shrink-0 items-center justify-center overflow-hidden ${rounded} border border-border bg-canvas`

  return (
    <span className={wrapperClasses}>
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

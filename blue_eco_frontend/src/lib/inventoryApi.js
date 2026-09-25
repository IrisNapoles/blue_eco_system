import api from './api'

// --- Products ---
// /products now paginates by default on the backend (20/page). all: 1
// asks it to return the plain, unpaginated array instead — same shape
// every caller of getProducts() already expects.
export const getProducts = () => api.get('/products', { params: { all: 1 } }).then((r) => r.data)
export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data)
export const createProduct = (formData) =>
  api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateProduct = (id, formData) => {
  // Laravel doesn't parse multipart on PUT the same way as POST, so we
  // spoof the method — standard Laravel pattern for multipart updates.
  formData.append('_method', 'PUT')
  return api.post(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// --- Stock Batches ---
// Also paginated by default now on the backend — same all: 1 fix as above.
export const getStockBatches = () =>
  api.get('/admin/stock-batches', { params: { all: 1 } }).then((r) => r.data)
export const createStockBatch = (payload) => api.post('/admin/stock-batches', payload)
export const getNextBatchNumber = (productId) =>
  api
    .get('/admin/stock-batches/next-batch-number', { params: { product_id: productId } })
    .then((r) => r.data.suggested_batch_no)
export const markBatchPrinted = (id, payload) => api.patch(`/admin/stock-batches/${id}/mark-printed`, payload)

// --- Stock Movements (bazaar/event log) ---
// Also paginated by default now on the backend — same all: 1 fix as above.
export const getStockMovements = () =>
  api.get('/admin/stock-movements', { params: { all: 1 } }).then((r) => r.data)
// FormData now (so an optional photo of the transferred stock can be attached).
export const createStockMovement = (payload) =>
  api.post('/admin/stock-movements', payload, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const markMovementReturned = (id, payload) =>
  api.patch(`/admin/stock-movements/${id}/mark-returned`, payload)
export const deleteStockMovement = (id) => api.delete(`/admin/stock-movements/${id}`)

// --- Supplies ---
// Also paginated by default now on the backend — same all: 1 fix as above.
export const getSupplies = () => api.get('/supplies', { params: { all: 1 } }).then((r) => r.data)
export const createSupply = (formData) =>
  api.post('/supplies', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateSupply = (id, formData) => {
  formData.append('_method', 'PUT')
  return api.post(`/supplies/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
export const deleteSupply = (id) => api.delete(`/supplies/${id}`)

export const getTopSellers = () => api.get('/products/top-sellers').then((r) => r.data)

export const lookupBarcode = (code) =>
  api.get('/stock-batches/lookup', { params: { code } }).then((r) => r.data)

// Threshold used purely on the frontend to flag low stock — there's no
// per-product reorder_level field on the backend (only Supply has one),
// so this is a simple constant for now. Easy to make configurable later.
// Physical storage locations. Add one here and it shows up everywhere:
// the stock batch form, the per-warehouse stock columns, and the
// transfer-log destination dropdown.
export const WAREHOUSES = ['Farm Warehouse', 'Parañaque']
// Label used for old batches saved before warehouses were required.
export const UNASSIGNED_WAREHOUSE = 'Unassigned'

// Some older batches were saved with a shorter/looser warehouse string
// (e.g. "Farm" instead of "Farm Warehouse"). Fold those into the same
// preset column/option instead of letting them show up as a look-alike
// duplicate everywhere warehouses are listed or grouped.
export function normalizeWarehouse(raw) {
  if (!raw) return UNASSIGNED_WAREHOUSE
  const trimmed = raw.trim()
  const lower = trimmed.toLowerCase()
  const match = WAREHOUSES.find((preset) => {
    const presetLower = preset.toLowerCase()
    return presetLower === lower || presetLower.startsWith(lower) || lower.startsWith(presetLower)
  })
  return match || trimmed
}

export const LOW_STOCK_THRESHOLD = 20
export const NEAR_EXPIRY_DAYS = 30

import api from './api'

// --- Products ---
export const getProducts = () => api.get('/products').then((r) => r.data)
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
export const getStockBatches = () => api.get('/admin/stock-batches').then((r) => r.data)
export const createStockBatch = (payload) => api.post('/admin/stock-batches', payload)
export const getNextBatchNumber = (productId) =>
  api
    .get('/admin/stock-batches/next-batch-number', { params: { product_id: productId } })
    .then((r) => r.data.suggested_batch_no)
export const markBatchPrinted = (id) => api.patch(`/admin/stock-batches/${id}/mark-printed`)

// --- Stock Movements (bazaar/event log) ---
export const getStockMovements = () => api.get('/admin/stock-movements').then((r) => r.data)
export const createStockMovement = (payload) => api.post('/admin/stock-movements', payload)
export const markMovementReturned = (id) => api.patch(`/admin/stock-movements/${id}/mark-returned`)
export const deleteStockMovement = (id) => api.delete(`/admin/stock-movements/${id}`)

// --- Supplies ---
export const getSupplies = () => api.get('/supplies').then((r) => r.data)
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
export const LOW_STOCK_THRESHOLD = 20
export const NEAR_EXPIRY_DAYS = 30

import api from './api'

export const updatePaymentMethod = (id, paymentMethod) =>
  api.put(`/distributor/orders/${id}/payment-method`, { payment_method: paymentMethod })

export const getDeliveryEstimate = (region, items) =>
  api.post('/distributor/delivery-estimate', { region, items }).then((r) => r.data)

// Distributor
export const getMyOrders = () => api.get('/distributor/orders').then((r) => r.data)
export const placeOrder = (payload) => api.post('/distributor/orders', payload).then((r) => r.data)
export const cancelOrder = (id) => api.put(`/distributor/orders/${id}/cancel`)
export const markReceived = (id) => api.put(`/distributor/orders/${id}/received`)
export const uploadProofOfPayment = (id, formData) =>
  api.post(`/distributor/orders/${id}/proof-of-payment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Admin
export const uploadPackedPhoto = (id, formData) =>
  api.post(`/admin/orders/${id}/packed-photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
export const getAllOrders = () => api.get('/admin/orders').then((r) => r.data)
export const updateOrderStatus = (id, status) => api.put(`/admin/orders/${id}/status`, { status })
export const verifyPayment = (id, action, note) =>
  api.put(`/admin/orders/${id}/verify-payment`, { action, note })

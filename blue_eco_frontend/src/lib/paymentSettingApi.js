import api from './api'

export const getPaymentSettings = () => api.get('/payment-settings').then((r) => r.data)
export const updatePaymentSettings = (formData) =>
  api.post('/admin/payment-settings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

import api from './api'

export const getShippingRates = () => api.get('/admin/shipping-rates').then((r) => r.data)
export const updateShippingRate = (id, payload) => api.put(`/admin/shipping-rates/${id}`, payload)

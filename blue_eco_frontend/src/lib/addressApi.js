import api from './api'

export const getAddresses = () => api.get('/distributor/addresses').then((r) => r.data)
export const createAddress = (payload) => api.post('/distributor/addresses', payload)
export const updateAddress = (id, payload) => api.put(`/distributor/addresses/${id}`, payload)
export const deleteAddress = (id) => api.delete(`/distributor/addresses/${id}`)
export const setDefaultAddress = (id) => api.put(`/distributor/addresses/${id}/default`)

import api from './api'

export const getSales = () => api.get('/staff/sales').then((r) => r.data)
export const createSale = (items) => api.post('/staff/sales', { items }).then((r) => r.data)

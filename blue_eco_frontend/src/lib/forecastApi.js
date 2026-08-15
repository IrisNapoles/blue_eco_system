import api from './api'

export const getSalesForecast = (periods = 14) =>
  api.get('/admin/reports/sales-forecast', { params: { periods } }).then((r) => r.data)

export const getProductForecast = (productId, periods = 14) =>
  api
    .get(`/admin/reports/product-forecast/${productId}`, { params: { periods } })
    .then((r) => r.data)

import api from './api'

export const getSalesVsWaste = (params = {}) =>
  api.get('/admin/reports/sales-vs-waste', { params }).then((r) => r.data)

export const getMonthlyTrend = (months = 6) =>
  api.get('/admin/reports/monthly-trend', { params: { months } }).then((r) => r.data)

export const getTopProducts = (params = {}) =>
  api.get('/admin/reports/top-products', { params }).then((r) => r.data)

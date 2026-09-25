import api from './api'

// --- Product Costs (COGS) ---
export const getProductCosts = () => api.get('/admin/settings/product-costs').then((r) => r.data)
export const updateProductCost = (productId, payload) =>
  api.post(`/admin/settings/product-costs/${productId}`, payload).then((r) => r.data)
export const bulkUpdateProductCosts = (payload) =>
  api.post('/admin/settings/product-costs/bulk', payload).then((r) => r.data)

// --- Operating Expenses ---
export const getOperatingExpenses = () => api.get('/admin/settings/operating-expenses').then((r) => r.data)
export const updateOperatingExpense = (payload) =>
  api.post('/admin/settings/operating-expenses', payload).then((r) => r.data)

// --- Tax Rate ---
export const updateTaxRate = (taxRatePercent) =>
  api.post('/admin/settings/tax-rate', { tax_rate_percent: taxRatePercent }).then((r) => r.data)

// --- Net Profit report (used on the Dashboard, kept here since it shares
// the same underlying config as the settings above) ---
export const getNetProfit = (params = {}) => api.get('/admin/reports/net-profit', { params }).then((r) => r.data)

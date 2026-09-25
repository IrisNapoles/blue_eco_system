import api from './api'

// /staff/sales now paginates by default on the backend (20/page). all: 1
// asks it to return the plain, unpaginated array instead — same shape
// every caller of getSales() already expects.
export const getSales = () => api.get('/staff/sales', { params: { all: 1 } }).then((r) => r.data)
export const createSale = (items) => api.post('/staff/sales', { items }).then((r) => r.data)

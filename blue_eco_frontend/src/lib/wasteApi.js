import api from './api'

export const getWasteLog = () => {
  // Staff and admin currently share the same underlying data; admin
  // review actions live under /admin/waste-log/{id}/status, but the
  // list itself is fetched from the staff route for both roles.
  // That route now paginates by default on the backend (20/page); all: 1
  // asks for the plain, unpaginated array instead — same shape every
  // caller of getWasteLog() already expects.
  return api.get('/staff/waste-log', { params: { all: 1 } }).then((r) => r.data)
}
export const createWasteLog = (formData) =>
  api.post('/staff/waste-log', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const updateWasteLogStatus = (id, status) =>
  api.put(`/admin/waste-log/${id}/status`, { status })

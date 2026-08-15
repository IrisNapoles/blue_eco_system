import api from './api'

export const createStaff = (payload) => api.post('/admin/staff', payload)
export const getPendingDistributors = () => api.get('/admin/distributors/pending').then((r) => r.data)
export const approveDistributor = (id) => api.post(`/admin/distributors/${id}/approve`)
export const declineDistributor = (id) => api.post(`/admin/distributors/${id}/decline`)
export const getAllUsers = () => api.get('/admin/users').then((r) => r.data)
export const updateUserStatus = (id, status) => api.put(`/admin/users/${id}/status`, { status })
export const deleteUser = (id) => api.delete(`/admin/users/${id}`)

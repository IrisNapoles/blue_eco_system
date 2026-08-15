import api from './api'

export const updateProfile = (payload) => api.put('/profile', payload).then((r) => r.data)
export const getCurrentUser = () => api.get('/user').then((r) => r.data)

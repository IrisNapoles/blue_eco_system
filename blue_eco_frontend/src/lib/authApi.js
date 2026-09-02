import api from './api'

export const register = (formData) =>
  api.post('/register', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

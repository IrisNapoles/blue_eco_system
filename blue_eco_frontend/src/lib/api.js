import axios from 'axios'

// Base URL comes from your .env file (VITE_API_URL) so it's easy to
// point at localhost while developing and at your deployed Laravel
// URL later — same pattern used for PROPHET_SERVICE_URL on the backend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: {
    Accept: 'application/json',
  },
})

// Attach the Sanctum bearer token (if we have one) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// If the backend ever says the token is invalid/expired (401), clear
// local auth state and send the user back to login instead of leaving
// them stuck on a broken page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

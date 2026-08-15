import api from './api'

export const getNotifications = () => api.get('/notifications').then((r) => r.data)
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.put('/notifications/read-all')

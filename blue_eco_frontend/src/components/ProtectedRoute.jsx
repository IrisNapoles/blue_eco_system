import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap any route that needs a signed-in user. Optionally restrict to
// specific roles: <ProtectedRoute roles={['admin']}>...</ProtectedRoute>
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

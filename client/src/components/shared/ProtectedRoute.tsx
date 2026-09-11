import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '../layout/AppLayout'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <AppLayout />
}

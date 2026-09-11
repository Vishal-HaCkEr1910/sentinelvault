import { useAuthStore } from '@/store/authStore'
import { can } from '@/lib/permissions'

interface Props {
  action: string
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ action, fallback = null, children }: Props) {
  const role = useAuthStore((s) => s.user?.role ?? '')
  return can(role, action) ? <>{children}</> : <>{fallback}</>
}

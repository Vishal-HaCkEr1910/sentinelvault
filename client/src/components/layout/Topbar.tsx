import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/button'
import { RoleBadge } from '@/components/shared/RoleBadge'

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/documents': 'Documents',
  '/documents/upload': 'Upload Document',
  '/documents/search': 'Search',
  '/custody': 'Sealed Custody',
  '/audit': 'Audit Trail',
  '/profile': 'Profile',
}

function getPageTitle(pathname: string): string {
  if (pathname.match(/^\/documents\/\d+\/verify$/)) return 'Verify Integrity'
  if (pathname.match(/^\/documents\/\d+$/)) return 'Document Detail'
  return ROUTE_TITLES[pathname] ?? 'Sentinel Vault'
}

export function Topbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h1 className="text-base font-semibold">{getPageTitle(location.pathname)}</h1>

      <div className="flex items-center gap-3">
        {user && <RoleBadge role={user.role} />}

        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:block">{user.full_name}</span>
          )}
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

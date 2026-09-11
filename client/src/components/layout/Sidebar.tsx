import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Upload,
  Search,
  Shield,
  ClipboardList,
  User,
  ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { can } from '@/lib/permissions'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  permission: string | null
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
    permission: null,
  },
  {
    label: 'Documents',
    to: '/documents',
    icon: <FileText className="h-4 w-4" />,
    permission: null,
  },
  {
    label: 'Upload',
    to: '/documents/upload',
    icon: <Upload className="h-4 w-4" />,
    permission: 'upload',
  },
  {
    label: 'Search',
    to: '/documents/search',
    icon: <Search className="h-4 w-4" />,
    permission: null,
  },
  {
    label: 'Sealed Custody',
    to: '/custody',
    icon: <Shield className="h-4 w-4" />,
    permission: 'custody_participate',
  },
  {
    label: 'Audit Trail',
    to: '/audit',
    icon: <ClipboardList className="h-4 w-4" />,
    permission: null,
  },
  {
    label: 'Profile',
    to: '/profile',
    icon: <User className="h-4 w-4" />,
    permission: null,
  },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role ?? ''

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.permission === null || can(role, item.permission)
  )

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Sentinel Vault</p>
          <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
            Evidence Management
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/documents'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      {user && (
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium leading-none">{user.full_name}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{user.username}</p>
        </div>
      )}
    </aside>
  )
}

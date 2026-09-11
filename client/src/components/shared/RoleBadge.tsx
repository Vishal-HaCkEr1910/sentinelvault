import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: string
  className?: string
}

const ROLE_STYLES: Record<string, string> = {
  Admin: 'bg-red-100 text-red-700',
  InvestigatingOfficer: 'bg-blue-100 text-blue-700',
  ForensicAnalyst: 'bg-purple-100 text-purple-700',
  Prosecutor: 'bg-orange-100 text-orange-700',
  Judge: 'bg-yellow-100 text-yellow-800',
  Clerk: 'bg-gray-100 text-gray-700',
}

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Admin',
  InvestigatingOfficer: 'Investigating Officer',
  ForensicAnalyst: 'Forensic Analyst',
  Prosecutor: 'Prosecutor',
  Judge: 'Judge',
  Clerk: 'Clerk',
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const style = ROLE_STYLES[role] ?? 'bg-gray-100 text-gray-700'
  const label = ROLE_LABELS[role] ?? role

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        style,
        className
      )}
    >
      {label}
    </span>
  )
}

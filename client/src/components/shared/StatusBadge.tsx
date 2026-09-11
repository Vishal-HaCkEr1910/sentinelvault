import { CheckCircle, AlertTriangle, Lock, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatusType = 'anchored' | 'pending' | 'sealed' | 'valid' | 'tampered'

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string; icon?: React.ReactNode }
> = {
  anchored: {
    label: 'Anchored',
    className: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-3 w-3" />,
  },
  sealed: {
    label: 'Sealed',
    className: 'bg-blue-100 text-blue-700',
    icon: <Lock className="h-3 w-3" />,
  },
  valid: {
    label: 'Valid',
    className: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  tampered: {
    label: 'Tampered',
    className: 'bg-red-100 text-red-700',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.icon}
      {config.label}
    </span>
  )
}

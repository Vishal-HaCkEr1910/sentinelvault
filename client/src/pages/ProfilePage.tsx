import { User, Building2, Briefcase, Key } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ROLE_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  const permissions = ROLE_PERMISSIONS[user.role] ?? []
  const isFullAccess = user.role === 'Admin' || user.role === 'Judge'

  return (
    <div className="max-w-2xl space-y-6">
      {/* Identity card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">{user.full_name}</CardTitle>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">{user.username}</p>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                Role
              </div>
              <RoleBadge role={user.role} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Department
              </div>
              <p className="text-sm text-muted-foreground">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Permissions</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Actions this role is authorised to perform.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {permissions.map((permission) => (
              <span
                key={permission}
                className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
              >
                {PERMISSION_LABELS[permission] ?? permission}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assigned cases */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Assigned Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {isFullAccess ? (
            <p className="text-sm text-muted-foreground">
              Full access — all cases visible to this role.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Assigned via system setup. Contact an administrator to update case assignments.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

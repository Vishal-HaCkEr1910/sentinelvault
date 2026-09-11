import { Link } from 'react-router-dom'
import {
  User,
  Building2,
  Briefcase,
  Key,
  ShieldCheck,
  FolderLock,
  FileCheck2,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  Hash,
  ArrowRight,
  Shield
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { ROLE_PERMISSIONS, PERMISSION_LABELS } from '@/lib/permissions'
import { RoleBadge } from '@/components/shared/RoleBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const DEPARTMENT_MAP: Record<string, { dept: string; jurisdiction: string; badgeId: string }> = {
  Admin: {
    dept: 'Internal Vigilance & Security Systems Administration',
    jurisdiction: 'Universal Oversight — All Jurisdictions',
    badgeId: 'SYS-SEC-001',
  },
  InvestigatingOfficer: {
    dept: 'Crime Investigation Department (CID) / State Police',
    jurisdiction: 'Metro Police Commissionerate — Zone 1',
    badgeId: 'POL-INV-4209',
  },
  ForensicAnalyst: {
    dept: 'Central Forensic Science Laboratory (CFSL) — Cyber & Evidence Division',
    jurisdiction: 'State Forensic Science Directorate',
    badgeId: 'FSL-ANL-8821',
  },
  Prosecutor: {
    dept: 'Directorate of Public Prosecution / State Legal Affairs',
    jurisdiction: 'Sessions Court Prosecution Division',
    badgeId: 'LEG-PRO-3140',
  },
  Judge: {
    dept: 'Sessions Court / High Court Judicial Bench',
    jurisdiction: 'Judicial Magistrate First Class (JMFC)',
    badgeId: 'JUD-MAG-1002',
  },
  Clerk: {
    dept: 'Court Registry & Judicial Records Depository',
    jurisdiction: 'Principal Sessions Court Registry',
    badgeId: 'CLK-REG-5512',
  },
}

const CASE_ASSIGNMENTS_MAP: Record<
  string,
  Array<{ id: number; code: string; title: string; type: string }>
> = {
  admin: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Primary Case' },
    { id: 2, code: 'FIR-2024-1198', title: 'Cyber Espionage & Data Exfiltration Investigation', type: 'Secondary Case' },
  ],
  judge_mehta: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Judicial Hearing' },
    { id: 2, code: 'FIR-2024-1198', title: 'Cyber Espionage & Data Exfiltration Investigation', type: 'Judicial Hearing' },
  ],
  io_sharma: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Lead Investigator' },
  ],
  io_verma: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Assisting Investigator' },
    { id: 2, code: 'FIR-2024-1198', title: 'Cyber Espionage & Data Exfiltration Investigation', type: 'Lead Investigator' },
  ],
  fa_patel: [
    { id: 2, code: 'FIR-2024-1198', title: 'Cyber Espionage & Data Exfiltration Investigation', type: 'Technical Forensic Lead' },
  ],
  prosecutor_rao: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Chief Prosecutor' },
  ],
  clerk_das: [
    { id: 1, code: 'FIR-2024-1123', title: 'State v. Financial Fraud & Asset Laundering', type: 'Registry Officer' },
    { id: 2, code: 'FIR-2024-1198', title: 'Cyber Espionage & Data Exfiltration Investigation', type: 'Registry Officer' },
  ],
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)

  if (!user) return null

  const permissions = ROLE_PERMISSIONS[user.role] ?? []
  const isFullAccess = user.role === 'Admin' || user.role === 'Judge'
  const deptInfo = DEPARTMENT_MAP[user.role] ?? {
    dept: 'Law Enforcement & Legal Department',
    jurisdiction: 'Assigned Judicial Jurisdiction',
    badgeId: 'OFF-SEC-0000',
  }

  const assignedCases =
    CASE_ASSIGNMENTS_MAP[user.username] ??
    (isFullAccess ? CASE_ASSIGNMENTS_MAP.admin : [{ id: 1, code: 'FIR-2024-1123', title: 'Assigned Case Dossier', type: 'Active Case' }])

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Top Cover Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Identity & Avatar */}
          <div className="flex items-start sm:items-center gap-5">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <User className="h-9 w-9 sm:h-11 sm:w-11" />
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {user.full_name}
                </h1>
                <RoleBadge role={user.role} />
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Identity
                </span>
              </div>
              <p className="text-sm font-mono text-muted-foreground">
                Official Handle: <span className="font-semibold text-foreground">@{user.username}</span> · Badge ID: <span className="font-mono">{deptInfo.badgeId}</span>
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-0.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>{deptInfo.dept}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-background p-3 text-center sm:text-left">
              <p className="text-[11px] font-medium text-muted-foreground">Access Scope</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {isFullAccess ? 'Universal (Cross-Case)' : 'Case-Scoped'}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background p-3 text-center sm:text-left">
              <p className="text-[11px] font-medium text-muted-foreground">Assigned Cases</p>
              <p className="text-sm font-bold text-primary mt-0.5">
                {assignedCases.length} Active {assignedCases.length === 1 ? 'Dossier' : 'Dossiers'}
              </p>
            </div>

            <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-background p-3 text-center sm:text-left">
              <p className="text-[11px] font-medium text-muted-foreground">PKI Clearance</p>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">
                X.509 Certified
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Official Deployment Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Briefcase className="h-4 w-4" />
                <CardTitle className="text-base">Official Deployment</CardTitle>
              </div>
              <CardDescription>Administrative assignment and institutional oversight</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground text-xs font-medium">Department</span>
                <span className="font-medium text-right text-foreground max-w-[220px] truncate text-xs sm:text-sm">
                  {deptInfo.dept}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground text-xs font-medium">Jurisdiction</span>
                <span className="font-medium text-right text-foreground text-xs sm:text-sm">
                  {deptInfo.jurisdiction}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-muted-foreground text-xs font-medium">Officer ID</span>
                <span className="font-mono text-xs font-bold text-primary">{deptInfo.badgeId}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-muted-foreground text-xs font-medium">Authority Model</span>
                <span className="text-xs font-medium text-foreground">
                  {isFullAccess ? 'Cross-Case Authority (Judge/Admin)' : 'Strict RBAC + Case Assigned'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cryptographic Credentials Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4" />
                <CardTitle className="text-base">PKI & Cryptographic Keys</CardTitle>
              </div>
              <CardDescription>Internal Certificate Authority & Key Isolation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-xs sm:text-sm">
              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">CA Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    ISSUED & VALID
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Signature Algorithm:</span>
                  <span className="text-foreground">ECDSA P-256 (SHA-256)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Key Wrapping:</span>
                  <span className="text-foreground">RSA-OAEP 2048-bit</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Compliance:</span>
                  <span className="text-foreground">BSA 2023 Sec 63(4)</span>
                </div>
              </div>

              <div className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong>Zero Cleartext Leakage:</strong> Documents shared with this account have
                  their symmetric AES-256 keys wrapped individually for this officer's public key.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Assigned Cases Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <FolderLock className="h-4 w-4" />
                  <CardTitle className="text-base">Assigned Case Dossiers</CardTitle>
                </div>
                <CardDescription>
                  {isFullAccess
                    ? 'Universal access granted to all case records across the registry.'
                    : 'Cases this officer has legal clearance to inspect and manage.'}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/documents">
                  Browse All
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignedCases.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                        {c.type}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">{c.title}</p>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/documents">View Files</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Authorized Permissions Matrix */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-primary">
                <Key className="h-4 w-4" />
                <CardTitle className="text-base">Role Permissions & Legal Mandates</CardTitle>
              </div>
              <CardDescription>
                System actions cryptographically enforced for role: <strong>{user.role}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {permissions.map((permission) => (
                  <div
                    key={permission}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-background"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {PERMISSION_LABELS[permission] ?? permission}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        action: {permission}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

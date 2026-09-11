import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Lock,
  Clock,
  Anchor,
  Upload,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { RoleBadge } from '../components/shared/RoleBadge';
import { StatusBadge } from '../components/shared/StatusBadge';
import { PermissionGate } from '../components/shared/PermissionGate';
import { listDocuments, anchorPending } from '../api/documents';
import { getAuditChain } from '../api/audit';

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  Icon,
  loading,
  color = 'text-primary',
}: {
  label: string;
  value: number;
  Icon: React.ElementType;
  loading: boolean;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          {loading ? (
            <div className="h-8 w-16 animate-pulse rounded bg-muted" />
          ) : (
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        </div>
        <div className={`rounded-lg bg-muted p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ── Quick action card ────────────────────────────────────────────────────────
function ActionCard({
  label,
  description,
  Icon,
  onClick,
  color = 'bg-primary/10 text-primary',
}: {
  label: string;
  description: string;
  Icon: React.ElementType;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors group"
    >
      <div className={`shrink-0 rounded-lg p-2.5 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

// ── Action color map (shared with audit list) ────────────────────────────────
const ACTION_COLORS: Record<string, string> = {
  UPLOAD: 'bg-blue-100 text-blue-700',
  VIEW: 'bg-gray-100 text-gray-600',
  UNSEAL: 'bg-purple-100 text-purple-700',
  ANCHOR: 'bg-green-100 text-green-700',
  CERTIFICATE_EXPORT: 'bg-orange-100 text-orange-700',
  VERIFY: 'bg-teal-100 text-teal-700',
  TAMPER_DEMO: 'bg-red-100 text-red-700',
  RESTORE_DEMO: 'bg-yellow-100 text-yellow-700',
};

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  });

  const { data: auditEntries = [], isLoading: auditLoading } = useQuery({
    queryKey: ['audit'],
    queryFn: () => getAuditChain(),
  });

  const anchorMutation = useMutation({ mutationFn: anchorPending });

  const handleAnchor = async () => {
    try {
      const result = await anchorMutation.mutateAsync();
      if (result.anchored_count === 0) {
        toast.info('All entries are already anchored');
      } else {
        toast.success(
          `Anchored ${result.anchored_count} entries into block #${result.block_index}`
        );
      }
    } catch {
      toast.error('Anchoring failed — try again');
    }
  };

  // ── Stats ──
  const totalDocs     = documents.length;
  const sealedDocs    = documents.filter((d) => d.is_sealed).length;
  const unanchored    = auditEntries.filter((e) => !e.anchored).length;
  const anchoredDocs  = documents.filter((d) => d.anchored).length;
  const isLoading     = docsLoading || auditLoading;

  // ── Recent slices ──
  const recentDocs = [...documents]
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 5);

  const recentAudit = [...auditEntries]
    .sort((a, b) => b.seq - a.seq)
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {/* ── Welcome banner ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.full_name ?? 'User'}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <RoleBadge role={user?.role ?? ''} />
            <span className="text-sm text-muted-foreground">Authenticated session</span>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Documents"    value={totalDocs}    Icon={FileText} loading={isLoading} color="text-primary"      />
        <StatCard label="Sealed Documents"   value={sealedDocs}   Icon={Lock}     loading={isLoading} color="text-blue-600"    />
        <StatCard label="Unanchored Entries" value={unanchored}   Icon={Clock}    loading={isLoading} color="text-yellow-600"  />
        <StatCard label="Anchored Documents" value={anchoredDocs} Icon={Anchor}   loading={isLoading} color="text-green-600"   />
      </div>

      {/* ── Quick actions + Recent audit ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          <div className="space-y-2">

            <PermissionGate action="upload">
              <ActionCard
                label="Upload Document"
                description="Add a new evidence file to the vault"
                Icon={Upload}
                onClick={() => navigate('/documents/upload')}
                color="bg-primary/10 text-primary"
              />
            </PermissionGate>

            <PermissionGate action="custody_participate">
              <ActionCard
                label="View Sealed Custody"
                description="Access k-of-n protected sealed documents"
                Icon={Lock}
                onClick={() => navigate('/custody')}
                color="bg-blue-50 text-blue-600"
              />
            </PermissionGate>

            <PermissionGate action="anchor">
              <button
                onClick={handleAnchor}
                disabled={anchorMutation.isPending}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/50 transition-colors group disabled:opacity-50"
              >
                <div className="shrink-0 rounded-lg p-2.5 bg-green-50 text-green-600">
                  <Anchor className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {anchorMutation.isPending ? 'Anchoring…' : 'Anchor Pending'}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Commit unanchored audit entries to the blockchain
                  </p>
                </div>
              </button>
            </PermissionGate>

            <ActionCard
              label="View Audit Trail"
              description="Full tamper-evident log of all system events"
              Icon={BookOpen}
              onClick={() => navigate('/audit')}
              color="bg-muted text-muted-foreground"
            />
          </div>
        </div>

        {/* Recent audit activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Audit Activity</h2>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs text-primary hover:underline"
            >
              View full audit trail →
            </button>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {auditLoading ? (
              <div className="space-y-1 p-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : recentAudit.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No audit entries yet
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentAudit.map((entry) => {
                  const color = ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600';
                  const ts = new Date(entry.timestamp * 1000).toLocaleString('en-IN');
                  return (
                    <li key={entry.seq} className="flex items-center gap-3 px-4 py-3">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
                        {entry.action}
                      </span>
                      <span className="flex-1 text-xs text-muted-foreground truncate">
                        {entry.actor_username}
                      </span>
                      <span className="shrink-0 text-xs font-mono text-muted-foreground/70">
                        {ts}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent documents ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent Documents</h2>
          <button
            onClick={() => navigate('/documents')}
            className="text-xs text-primary hover:underline"
          >
            View all documents →
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Title</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {docsLoading
                ? [1, 2, 3].map((i) => (
                    <tr key={i} className="border-b border-border">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : recentDocs.length === 0
                ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No documents yet
                    </td>
                  </tr>
                )
                : recentDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-foreground max-w-[200px] truncate">
                        {doc.title}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                          {doc.doc_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {new Date(doc.created_at * 1000).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {doc.is_sealed && <StatusBadge status="sealed" />}
                          {doc.anchored  && <StatusBadge status="anchored" />}
                          {!doc.is_sealed && !doc.anchored && <StatusBadge status="pending" />}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

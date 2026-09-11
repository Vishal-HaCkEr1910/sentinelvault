import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { RefreshCw, ShieldCheck, Anchor, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuditChain, useVerifyAuditChain, useAnchorPending } from '../hooks/useAudit';
import { AuditEntryRow } from '../components/shared/AuditEntryRow';
import { PermissionGate } from '../components/shared/PermissionGate';

function VerifyModal({
  result,
  onClose,
}: {
  result: { valid: boolean; broken_at_seq: number | null; reason: string | null } | null;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Audit Chain Verification</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {result.valid ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Chain Integrity Verified</p>
            <p className="text-sm text-muted-foreground">
              All entries in the audit chain are cryptographically valid. No tampering detected.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-semibold text-red-700">Chain Integrity Compromised</p>
            {result.broken_at_seq != null && (
              <p className="text-sm text-muted-foreground">
                Break detected at entry <span className="font-mono font-semibold">#{result.broken_at_seq}</span>
              </p>
            )}
            {result.reason && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {result.reason}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              This indicates potential tampering with the audit log.
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const documentId = searchParams.get('document_id')
    ? Number(searchParams.get('document_id'))
    : undefined;

  const [filterInput, setFilterInput] = useState(documentId?.toString() ?? '');
  const [verifyModalResult, setVerifyModalResult] = useState<{
    valid: boolean;
    broken_at_seq: number | null;
    reason: string | null;
  } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { data: entries = [], isLoading, refetch } = useAuditChain(documentId);
  const verifyMutation = useVerifyAuditChain();
  const anchorMutation = useAnchorPending();

  const handleVerifyChain = async () => {
    try {
      const result = await verifyMutation.mutateAsync();
      setVerifyModalResult(result);
      setShowModal(true);
    } catch {
      toast.error('Verification failed — try again');
    }
  };

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
      refetch();
    } catch {
      toast.error('Anchoring failed — try again');
    }
  };

  const handleFilterApply = () => {
    const val = filterInput.trim();
    if (val && !isNaN(Number(val))) {
      navigate(`/audit?document_id=${val}`);
    } else {
      navigate('/audit');
    }
  };

  const handleClearFilter = () => {
    setFilterInput('');
    navigate('/audit');
  };

  const skeletonRows = Array.from({ length: 8 });

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
            {documentId != null && (
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                Filtered to Document #{documentId}
                <button
                  onClick={handleClearFilter}
                  className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                  title="Clear filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerifyChain}
              disabled={verifyMutation.isPending}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {verifyMutation.isPending ? 'Verifying…' : 'Verify Chain'}
            </button>

            <PermissionGate action="anchor">
              <button
                onClick={handleAnchor}
                disabled={anchorMutation.isPending}
                className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Anchor className="h-4 w-4" />
                {anchorMutation.isPending ? 'Anchoring…' : 'Anchor Pending'}
              </button>
            </PermissionGate>

            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFilterApply()}
            placeholder="Filter by document ID"
            className="w-52 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleFilterApply}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
          {documentId != null && (
            <button
              onClick={handleClearFilter}
              className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{entries.length}</span>{' '}
            {entries.length === 1 ? 'entry' : 'entries'}
          </p>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Seq</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actor</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Document</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Timestamp</th>
                <th className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Anchored</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? skeletonRows.map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : entries.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No audit entries found
                    </td>
                  </tr>
                )
                : entries.map((entry) => (
                    <AuditEntryRow key={entry.seq} entry={entry} />
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify result modal */}
      {showModal && (
        <VerifyModal result={verifyModalResult} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

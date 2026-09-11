import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  RefreshCw, ShieldCheck, Anchor, X, AlertTriangle, CheckCircle,
  ClipboardList, Hash, Link2, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuditChain, useVerifyAuditChain, useAnchorPending } from '../hooks/useAudit';
import { AuditEntryRow } from '../components/shared/AuditEntryRow';
import { PermissionGate } from '../components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function VerifyModal({
  result,
  onClose,
}: {
  result: { valid: boolean; broken_at_seq: number | null; reason: string | null } | null;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Audit Chain Verification</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {result.valid ? (
          <div className="flex flex-col items-center gap-4 py-5 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-700">Chain Integrity Verified</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                All entries in the audit chain are cryptographically valid. No tampering detected.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-5 text-center">
            <div className="h-16 w-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700">Chain Integrity Compromised</p>
              {result.broken_at_seq != null && (
                <p className="text-sm text-muted-foreground mt-1">
                  Break detected at entry <span className="font-mono font-semibold">#{result.broken_at_seq}</span>
                </p>
              )}
              {result.reason && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">
                  {result.reason}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This indicates potential tampering with the audit log.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
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
      <div className="w-full space-y-6 pb-8">
        {/* Full-width Cover Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Title */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Immutable Audit Trail
                  </h1>
                  {documentId != null && (
                    <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary font-medium">
                      Filtered: Doc #{documentId}
                      <button
                        onClick={handleClearFilter}
                        className="ml-1 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                        title="Clear filter"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ECDSA-signed, hash-chained event log ensuring tamper-evident legal accountability
                </p>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyChain}
                disabled={verifyMutation.isPending}
                className="gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                {verifyMutation.isPending ? 'Verifying…' : 'Verify Chain'}
              </Button>

              <PermissionGate action="anchor">
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleAnchor}
                  disabled={anchorMutation.isPending}
                >
                  <Anchor className="h-4 w-4" />
                  {anchorMutation.isPending ? 'Anchoring…' : 'Anchor Pending'}
                </Button>
              </PermissionGate>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                title="Refresh"
                className="h-9 w-9"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Hash,
              title: 'SHA-256 Hash Chaining',
              desc: 'Each audit entry links to the previous entry\'s hash, creating a tamper-evident chain.',
            },
            {
              icon: Link2,
              title: 'ECDSA Signing',
              desc: 'Every entry is signed with the actor\'s ECDSA key, cryptographically binding identity.',
            },
            {
              icon: Clock,
              title: 'Merkle Anchoring',
              desc: 'Pending entries are batched into Merkle root blocks for immutable timestamping.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
          <span className="text-sm font-medium text-foreground shrink-0">Filter by Document ID:</span>
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="number"
              value={filterInput}
              onChange={(e) => setFilterInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterApply()}
              placeholder="Enter document ID..."
              className="max-w-xs h-9 text-sm"
            />
            <Button size="sm" onClick={handleFilterApply} className="h-9">
              Apply
            </Button>
            {documentId != null && (
              <Button size="sm" variant="outline" onClick={handleClearFilter} className="h-9">
                Clear
              </Button>
            )}
          </div>

          {!isLoading && (
            <span className="text-sm text-muted-foreground shrink-0 ml-auto">
              <strong className="text-foreground">{entries.length}</strong>{' '}
              {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
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
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">No audit entries found</p>
                      </div>
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

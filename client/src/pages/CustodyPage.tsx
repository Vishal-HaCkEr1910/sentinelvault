import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/permissions';
import { listDocuments } from '../api/documents';
import { useUnseal } from '../hooks/useCustody';
import { Document, UnsealResponse } from '../api/types';
import { DEMO_USERS } from '../lib/constants';

// Progress bar component
function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CustodyCard({ doc }: { doc: Document }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [unsealResult, setUnsealResult] = useState<UnsealResponse | null>(null);
  const unsealMutation = useUnseal(doc.id);

  const k = doc.custody_k ?? 1;
  const custodians = DEMO_USERS.filter((u) =>
    ['Admin', 'InvestigatingOfficer', 'ForensicAnalyst', 'Prosecutor', 'Judge'].includes(u.role)
  ).map((u) => u.username);

  const toggleCustodian = useCallback((username: string) => {
    setSelected((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  }, []);

  const handleUnseal = async () => {
    try {
      const result = await unsealMutation.mutateAsync(selected);
      setUnsealResult(result);
    } catch {
      // network / server error — show nothing special (custody errors display inline)
    }
  };

  const uploadDate = new Date(doc.created_at * 1000).toLocaleDateString('en-IN');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="border-b border-border bg-muted/30 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{doc.title}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {doc.doc_type} · Case #{doc.case_id} · by {doc.uploader_username} · {uploadDate}
            </p>
          </div>
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 px-3 py-1 text-sm font-medium">
            <Lock className="h-3.5 w-3.5" />
            Requires {k} of {doc.custody_n ?? k} custodians
          </span>
        </div>
      </div>

      {/* Custodian selection */}
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground mb-2">Select approving custodians</p>
          <div className="grid grid-cols-2 gap-2">
            {custodians.map((username) => (
              <label
                key={username}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 hover:bg-muted transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(username)}
                  onChange={() => toggleCustodian(username)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
                <span className="text-sm font-mono text-foreground">{username}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Counter + Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Selected{' '}
              <span className={selected.length >= k ? 'text-green-600 font-semibold' : 'text-foreground font-semibold'}>
                {selected.length}
              </span>{' '}
              of <span className="font-semibold">{k}</span> needed
            </span>
            {selected.length >= k && (
              <span className="text-green-600 text-xs font-medium">Ready to unseal</span>
            )}
          </div>
          <ProgressBar value={selected.length} max={k} />
        </div>

        {/* Unseal button */}
        <button
          onClick={handleUnseal}
          disabled={selected.length < k || unsealMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {unsealMutation.isPending ? 'Attempting unseal…' : 'Attempt Unseal'}
        </button>

        {/* Result */}
        {unsealResult && !unsealResult.unlocked && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Not enough approvers</p>
              <p className="mt-0.5">
                Have {unsealResult.have} of {unsealResult.need} required custodians. Select{' '}
                {unsealResult.need - unsealResult.have} more custodian
                {unsealResult.need - unsealResult.have !== 1 ? 's' : ''} and try again.
              </p>
            </div>
          </div>
        )}

        {unsealResult?.unlocked && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <p className="text-sm font-medium text-green-800">Document Unsealed Successfully</p>
            </div>
            {unsealResult.content_base64 && (
              <DocumentPreview content_base64={unsealResult.content_base64} title={doc.title} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentPreview({ content_base64, title }: { content_base64: string; title: string }) {
  // Detect file type from base64 prefix magic bytes
  const raw = atob(content_base64.slice(0, 16));
  const isPdf = raw.startsWith('%PDF');

  if (isPdf) {
    const dataUrl = `data:application/pdf;base64,${content_base64}`;
    return (
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
        </div>
        <iframe
          src={dataUrl}
          className="w-full h-96"
          title={title}
        />
      </div>
    );
  }

  // Non-PDF: offer download
  const handleDownload = () => {
    const bytes = Uint8Array.from(atob(content_base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = title;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      <FileText className="h-4 w-4" />
      Download {title}
    </button>
  );
}

export default function CustodyPage() {
  const role = useAuthStore((s) => s.user?.role ?? '');

  if (!can(role, 'custody_participate')) {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: allDocuments = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: listDocuments,
  });

  const sealedDocs = allDocuments.filter((d) => d.is_sealed);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-foreground">Sealed Custody Documents</h1>
        {!isLoading && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {sealedDocs.length} sealed
          </span>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && sealedDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card py-16 text-center">
          <Lock className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-lg font-medium text-foreground">No sealed documents found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sealed documents require k-of-n custodian approval to access.
            </p>
          </div>
        </div>
      )}

      {/* Sealed doc cards */}
      {!isLoading && sealedDocs.length > 0 && (
        <div className="space-y-4">
          {sealedDocs.map((doc) => (
            <CustodyCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

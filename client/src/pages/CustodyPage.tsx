import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock, AlertTriangle, CheckCircle, FileText, Shield, Key, Users, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { can } from '../lib/permissions';
import { listDocuments } from '../api/documents';
import { useUnseal } from '../hooks/useCustody';
import { Document, UnsealResponse } from '../api/types';
import { DEMO_USERS } from '../lib/constants';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
  const readyToUnseal = selected.length >= k;

  return (
    <Card className="shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="border-b border-border bg-gradient-to-r from-muted/50 to-muted/20 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground leading-tight">{doc.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                {doc.doc_type} · Case #{doc.case_id} · by {doc.uploader_username} · {uploadDate}
              </p>
            </div>
          </div>
          <span className="shrink-0 flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 text-xs font-semibold">
            <Shield className="h-3 w-3" />
            {k}-of-{doc.custody_n ?? k} Custodians
          </span>
        </div>
      </div>

      <CardContent className="px-5 py-5 space-y-5">
        {/* Custodian selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              Select Approving Custodians
            </p>
            <span className="text-xs text-muted-foreground font-mono">
              Shamir's Secret Sharing
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {custodians.map((username) => {
              const isSelected = selected.includes(username);
              return (
                <label
                  key={username}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 hover:bg-muted/50 transition-all ${
                    isSelected
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-border bg-background text-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCustodian(username)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  <span className="text-xs font-mono font-medium truncate">{username}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Counter + Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground text-xs">
              Selected{' '}
              <span className={readyToUnseal ? 'text-emerald-600 font-bold' : 'text-foreground font-bold'}>
                {selected.length}
              </span>{' '}
              of <span className="font-bold">{k}</span> needed
            </span>
            {readyToUnseal && (
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Ready to unseal
              </span>
            )}
          </div>
          <ProgressBar value={selected.length} max={k} />
        </div>

        {/* Unseal button */}
        <button
          onClick={handleUnseal}
          disabled={selected.length < k || unsealMutation.isPending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {unsealMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Attempting unseal…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Key className="h-4 w-4" />
              Attempt Multi-Party Unseal
            </span>
          )}
        </button>

        {/* Result — Not enough */}
        {unsealResult && !unsealResult.unlocked && (
          <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold">Insufficient Approvers</p>
              <p className="mt-0.5 text-xs">
                Have {unsealResult.have} of {unsealResult.need} required custodians. Select{' '}
                {unsealResult.need - unsealResult.have} more custodian
                {unsealResult.need - unsealResult.have !== 1 ? 's' : ''} and try again.
              </p>
            </div>
          </div>
        )}

        {/* Result — Success */}
        {unsealResult?.unlocked && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">Document Unsealed Successfully</p>
            </div>
            {unsealResult.content_base64 && (
              <DocumentPreview content_base64={unsealResult.content_base64} title={doc.title} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentPreview({ content_base64, title }: { content_base64: string; title: string }) {
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
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
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
    <div className="w-full space-y-6 pb-8">
      {/* Full-width Cover Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
          <div className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-blue-500/5 blur-xl" />
        </div>

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Sealed Custody Documents
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Multi-party cryptographic custody using Shamir's Secret Sharing over GF(2⁸)
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            {!isLoading && (
              <>
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-primary">{sealedDocs.length}</p>
                  <p className="text-xs text-muted-foreground">Sealed Docs</p>
                </div>
                <div className="rounded-xl border border-border bg-background px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{allDocuments.length}</p>
                  <p className="text-xs text-muted-foreground">Total Docs</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* How it works — info bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            icon: Key,
            title: 'Shamir Key Splitting',
            desc: 'Encryption key is split into N shares. Minimum K shares needed to reconstruct.',
          },
          {
            icon: Users,
            title: 'Custodian Approval',
            desc: 'Each custodian holds one key share. K custodians must jointly approve access.',
          },
          {
            icon: Shield,
            title: 'Court-Admissible',
            desc: 'Multi-party custody creates a verifiable, tamper-evident access control record.',
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

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && sealedDocs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card py-20 text-center">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">No sealed documents found</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Sealed documents require k-of-n custodian approval to access. Upload a document with sealing enabled to get started.
            </p>
          </div>
        </div>
      )}

      {/* Sealed doc cards */}
      {!isLoading && sealedDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing <strong className="text-foreground">{sealedDocs.length}</strong> sealed document{sealedDocs.length !== 1 ? 's' : ''} requiring multi-party access
            </p>
          </div>
          {sealedDocs.map((doc) => (
            <CustodyCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  );
}

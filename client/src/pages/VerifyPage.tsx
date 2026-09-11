import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, AlertTriangle, FlaskConical, RotateCcw } from 'lucide-react';
import { verifyDocument, tamperDemo, restoreDemo } from '../api/documents';
import { VerifyReport } from '../components/shared/VerifyReport';
import { useAuthStore } from '../store/authStore';

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const docId = Number(id);

  const [showTamperConfirm, setShowTamperConfirm] = useState(false);
  const [tamperDone, setTamperDone] = useState(false);
  const [isTampering, setIsTampering] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    data: verifyResult,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['verify', docId],
    queryFn: () => verifyDocument(docId),
  });

  const isAdminOrIO =
    user?.role === 'Admin' || user?.role === 'InvestigatingOfficer';

  const handleTamper = async () => {
    setShowTamperConfirm(false);
    setIsTampering(true);
    try {
      await tamperDemo(docId);
      setTamperDone(true);
      refetch();
    } finally {
      setIsTampering(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreDemo(docId);
      setTamperDone(false);
      refetch();
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/documents/${docId}`)}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Integrity Verification</h1>
              <p className="text-sm text-muted-foreground">Document #{docId}</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Re-run Verification
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-sm text-muted-foreground">Running cryptographic verification…</p>
          </div>
        )}

        {/* Report */}
        {verifyResult && !isLoading && <VerifyReport result={verifyResult} />}

        {/* Demo controls — Admin + IO only */}
        {isAdminOrIO && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 before:flex-1 before:h-px before:bg-border after:flex-1 after:h-px after:bg-border">
              <span className="text-xs font-medium text-muted-foreground px-2">Demo Controls</span>
            </div>

            <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
                <p className="text-sm text-orange-800">
                  These controls simulate real-world tampering and restoration for demonstration purposes.
                </p>
              </div>

              <div className="flex gap-2">
                {!tamperDone && (
                  <button
                    onClick={() => setShowTamperConfirm(true)}
                    disabled={isTampering}
                    className="flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {isTampering ? 'Tampering…' : 'Tamper Document'}
                  </button>
                )}
                {tamperDone && (
                  <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isRestoring ? 'Restoring…' : 'Restore Document'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tamper confirmation dialog */}
      {showTamperConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="font-semibold text-foreground">Tamper Document?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This will corrupt the stored file to demonstrate tamper detection. The integrity check will fail afterwards.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTamperConfirm(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTamper}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

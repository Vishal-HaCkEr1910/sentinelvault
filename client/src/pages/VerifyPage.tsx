import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  Scale,
  FileText,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { verifyDocument, tamperDemo, restoreDemo } from '../api/documents';
import { VerifyReport } from '../components/shared/VerifyReport';
import { useAuthStore } from '../store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="w-full space-y-6 pb-8">
        {/* Full-width Cover Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-card via-card to-muted/40 p-6 sm:p-8 shadow-sm">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
            <div className="absolute bottom-0 left-1/4 h-24 w-24 rounded-full bg-primary/5 blur-xl" />
          </div>

          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap mb-0.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/documents/${docId}`)}
                    className="gap-1.5 h-7 px-2 text-muted-foreground hover:text-foreground -ml-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Doc #{docId}
                  </Button>
                  <span className="text-muted-foreground text-xs">/</span>
                  <span className="text-xs text-muted-foreground">Integrity Verification</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Cryptographic Integrity Audit
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Live verification against SHA-256 digest, ECDSA audit chain, and Merkle root
                </p>
              </div>
            </div>

            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="gap-1.5 self-start lg:self-auto shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Re-run Verification
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-sm text-muted-foreground font-mono">Running cryptographic verification…</p>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        {verifyResult && !isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Report Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              <VerifyReport result={verifyResult} />

              <div className="flex items-center gap-3 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/documents/${docId}`}>
                    <FileText className="h-4 w-4 mr-1.5" />
                    Inspect Document Plaintext & Keys
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/documents">Back to Case Register</Link>
                </Button>
              </div>
            </div>

            {/* Sidebar Column (4 cols): Demo Controls & Evidentiary Guidance */}
            <div className="lg:col-span-4 space-y-6">
              {/* Tamper Simulation Lab Card */}
              {isAdminOrIO && (
                <Card className="border-dashed border-amber-300 bg-amber-50/40 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <FlaskConical className="h-4 w-4" />
                      <CardTitle className="text-base">Adversarial Tamper Lab</CardTitle>
                    </div>
                    <CardDescription className="text-xs text-amber-900/80">
                      Simulate real-world evidence corruption to test cryptographic detection in real time.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 rounded-lg bg-amber-100/60 border border-amber-200 text-xs text-amber-900 space-y-1">
                      <p className="font-semibold">Test Protocol:</p>
                      <p>
                        Clicking "Tamper Document" modifies byte sequences in the encrypted blob. The system will detect
                        the mismatch against the stored hash and the Merkle root immediately.
                      </p>
                    </div>

                    <div className="pt-1">
                      {!tamperDone ? (
                        <Button
                          onClick={() => setShowTamperConfirm(true)}
                          disabled={isTampering}
                          variant="destructive"
                          size="sm"
                          className="w-full gap-1.5 shadow-sm"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          {isTampering ? 'Simulating Tampering…' : 'Tamper Document (Corrupt Blob)'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleRestore}
                          disabled={isRestoring}
                          className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                          size="sm"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {isRestoring ? 'Restoring Payload…' : 'Restore Original Blob'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legal Admissibility Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Scale className="h-4 w-4" />
                    <CardTitle className="text-base">Legal Admissibility Standards</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Section 63(4) BSA 2023:</strong> The automated verification validates the electronic record's
                      chain of custody without human bias.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Merkle Tree Root:</strong> Guarantees the document existed in this exact bitwise state when
                      anchored to the ledger block.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Tamper confirmation dialog */}
      {showTamperConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <h2 className="font-semibold text-foreground">Simulate Evidence Tampering?</h2>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  This will deliberately corrupt the stored encrypted ciphertext on disk. The subsequent integrity
                  verification check will immediately fail and flag the compromise.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowTamperConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleTamper}>
                Proceed to Tamper
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

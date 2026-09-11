import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ShieldCheck, FileText, ClipboardList,
  AlertTriangle, RotateCcw, Lock, Download
} from 'lucide-react';
import { useDocument, useGenerateCertificate, useTamperDemo, useRestoreDemo } from '@/hooks/useDocuments';
import { useAuthStore } from '@/store/authStore';
import { can } from '@/lib/permissions';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';

function detectMimeType(base64: string): string {
  const decoded = atob(base64.slice(0, 8));
  const bytes = Array.from(decoded).map((c) => c.charCodeAt(0));
  if (bytes[0] === 0x25 && bytes[1] === 0x50) return 'application/pdf'; // %PDF
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  return 'application/octet-stream';
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const docId = Number(id);

  const { data: doc, isLoading, error } = useDocument(docId);
  const generateCert = useGenerateCertificate(docId);
  const tamper = useTamperDemo(docId);
  const restore = useRestoreDemo(docId);

  const [certDialog, setCertDialog] = useState<{ open: boolean; filename?: string }>({ open: false });
  const [tamperConfirm, setTamperConfirm] = useState(false);

  const isAdminOrIO = role === 'Admin' || role === 'InvestigatingOfficer';

  const handleGenerateCert = async () => {
    try {
      const res = await generateCert.mutateAsync();
      setCertDialog({ open: true, filename: res.filename });
    } catch {
      toast.error('Failed to generate certificate');
    }
  };

  const handleTamper = async () => {
    setTamperConfirm(false);
    try {
      await tamper.mutateAsync();
      toast.success('Document tampered for demo');
    } catch {
      toast.error('Tamper failed');
    }
  };

  const handleRestore = async () => {
    try {
      await restore.mutateAsync();
      toast.success('Document restored');
    } catch {
      toast.error('Restore failed');
    }
  };

  const handleDownload = (base64: string, mimeType: string) => {
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc?.title ?? 'document';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const is403 = (error as { response?: { status: number } })?.response?.status === 403;

  if (!doc && is403) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">🔒 You were not granted access to this document.</p>
        <p className="text-sm text-gray-400 mt-1">Your role and keys do not allow decryption of this file.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/documents')}>
          Back to Documents
        </Button>
      </div>
    );
  }

  if (!doc) return null;

  const mimeType = doc.content_base64 ? detectMimeType(doc.content_base64) : '';
  const isPdf = mimeType === 'application/pdf';
  const isImage = mimeType.startsWith('image/');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold">{doc.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Metadata */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Metadata</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Document Type</span>
                <Badge variant="secondary">{doc.doc_type}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Case ID</span>
                <span>#{doc.case_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Uploaded by</span>
                <span className="font-mono">{doc.uploader_username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Upload Date</span>
                <span>{new Date(doc.created_at * 1000).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Sealed</span>
                <StatusBadge status={doc.is_sealed ? 'sealed' : 'pending'} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Anchored</span>
                <StatusBadge status={doc.anchored ? 'anchored' : 'pending'} />
              </div>
              {doc.is_sealed && doc.custody_k && doc.custody_n && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Custody</span>
                  <span>{doc.custody_k} of {doc.custody_n} custodians</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg border bg-white p-5 space-y-2">
            <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-3">Actions</h2>
            <PermissionGate action="verify">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => navigate(`/documents/${docId}/verify`)}
              >
                <ShieldCheck className="h-4 w-4" />
                Verify Integrity
              </Button>
            </PermissionGate>
            <PermissionGate action="generate_certificate">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleGenerateCert}
                disabled={generateCert.isPending}
              >
                <FileText className="h-4 w-4" />
                {generateCert.isPending ? 'Generating...' : 'Generate Certificate'}
              </Button>
            </PermissionGate>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => navigate(`/audit?document_id=${docId}`)}
            >
              <ClipboardList className="h-4 w-4" />
              View in Audit Trail
            </Button>
            {isAdminOrIO && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => setTamperConfirm(true)}
                  disabled={tamper.isPending}
                >
                  <AlertTriangle className="h-4 w-4" />
                  Tamper Demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 text-green-600 border-green-200 hover:bg-green-50"
                  onClick={handleRestore}
                  disabled={restore.isPending}
                >
                  <RotateCcw className="h-4 w-4" />
                  Restore Demo
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Right: Content */}
        <div className="rounded-lg border bg-white p-5">
          <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-4">Document Content</h2>
          {doc.is_sealed ? (
            <div className="text-center py-8 space-y-3">
              <Lock className="h-10 w-10 mx-auto text-blue-300" />
              <p className="text-gray-600 font-medium">🔏 This document requires custody approval to access.</p>
              <p className="text-sm text-gray-400">Go to Sealed Custody page to request unseal.</p>
              <Button variant="outline" onClick={() => navigate('/custody')}>
                Go to Sealed Custody
              </Button>
            </div>
          ) : doc.content_base64 ? (
            <div>
              {isPdf ? (
                <div>
                  <p className="text-sm text-gray-500 mb-2">PDF document — rendering inline</p>
                  <iframe
                    src={`data:application/pdf;base64,${doc.content_base64}`}
                    className="w-full h-96 rounded border"
                    title={doc.title}
                  />
                </div>
              ) : isImage ? (
                <img
                  src={`data:${mimeType};base64,${doc.content_base64}`}
                  alt={doc.title}
                  className="max-w-full rounded border"
                />
              ) : (
                <div className="text-center py-8 space-y-3">
                  <FileText className="h-10 w-10 mx-auto text-gray-300" />
                  <p className="text-sm text-gray-500">File preview not available for this type</p>
                  <Button
                    variant="outline"
                    onClick={() => handleDownload(doc.content_base64, mimeType)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No content available</p>
          )}
        </div>
      </div>

      {/* Certificate Dialog */}
      <Dialog open={certDialog.open} onOpenChange={(open) => setCertDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Certificate Generated</DialogTitle>
            <DialogDescription>
              <div className="space-y-2 text-sm mt-2">
                <p><strong>Filename:</strong> {certDialog.filename}</p>
                <p>This certificate follows BSA §63(4) format.</p>
                <p className="text-gray-400">Note: Certificate download requires backend endpoint (coming soon).</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCertDialog({ open: false })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tamper Confirm Dialog */}
      <Dialog open={tamperConfirm} onOpenChange={setTamperConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Tamper Demo</DialogTitle>
            <DialogDescription>
              This will corrupt the stored file to demonstrate tamper detection. Proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTamperConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleTamper}>Confirm Tamper</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

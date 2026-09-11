import { useState } from 'react';
import { CheckCircle, XCircle, Minus, Copy, Check } from 'lucide-react';
import { VerifyResponse } from '../../api/types';
import { cn } from '../../lib/utils';

interface VerifyReportProps {
  result: VerifyResponse;
}

function HashDisplay({ label, hash, mismatch }: { label: string; hash: string; mismatch: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = hash.length > 32 ? hash.slice(0, 32) + '…' : hash;

  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-40 text-sm text-muted-foreground shrink-0">{label}:</span>
      <code
        className={cn(
          'flex-1 text-xs font-mono px-2 py-1 rounded bg-muted truncate',
          mismatch && 'text-red-600 bg-red-50 border border-red-200'
        )}
        title={hash}
      >
        {display}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Copy full hash"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

type CheckStatus = 'pass' | 'fail' | 'na';

function CheckRow({ label, status }: { label: string; status: CheckStatus }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {status === 'pass' && (
        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Pass
        </span>
      )}
      {status === 'fail' && (
        <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
          <XCircle className="h-4 w-4" />
          Fail
        </span>
      )}
      {status === 'na' && (
        <span className="flex items-center gap-1 text-muted-foreground text-sm">
          <Minus className="h-4 w-4" />
          N/A — not yet anchored
        </span>
      )}
    </div>
  );
}

export function VerifyReport({ result }: VerifyReportProps) {
  const hashMismatch = result.stored_hash !== result.recomputed_hash;

  const merkleStatus: CheckStatus =
    result.merkle_proof_valid === null ? 'na' : result.merkle_proof_valid ? 'pass' : 'fail';
  const chainStatus: CheckStatus =
    result.chain_valid === null ? 'na' : result.chain_valid ? 'pass' : 'fail';

  return (
    <div className="space-y-6">
      {/* Overall verdict banner */}
      {result.overall_valid ? (
        <div className="flex items-start gap-4 rounded-xl border border-green-200 bg-green-50 px-6 py-5">
          <CheckCircle className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
          <div>
            <p className="text-lg font-semibold text-green-800">Document Integrity Verified</p>
            <p className="mt-1 text-sm text-green-700">
              All cryptographic checks passed. This document has not been tampered with.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-5">
          <XCircle className="mt-0.5 h-7 w-7 shrink-0 text-red-600" />
          <div>
            <p className="text-lg font-semibold text-red-800">Integrity Check FAILED — Document May Be Tampered</p>
            <p className="mt-1 text-sm text-red-700">
              One or more cryptographic checks failed. This document may have been altered.
            </p>
          </div>
        </div>
      )}

      {/* Individual checks */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Integrity Checks</h3>
        <div className="divide-y divide-border">
          <CheckRow
            label="File hash matches original"
            status={result.blob_intact ? 'pass' : 'fail'}
          />
          <CheckRow
            label="Audit chain is intact"
            status={result.audit_chain_valid ? 'pass' : 'fail'}
          />
          <CheckRow label="Merkle proof valid" status={merkleStatus} />
          <CheckRow label="Blockchain chain valid" status={chainStatus} />
        </div>
      </div>

      {/* Hash display */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Hash Comparison</h3>
        <HashDisplay label="Stored hash" hash={result.stored_hash} mismatch={hashMismatch} />
        <HashDisplay label="Recomputed hash" hash={result.recomputed_hash} mismatch={hashMismatch} />
        {hashMismatch && (
          <p className="mt-2 text-xs text-red-600 font-medium">
            ⚠ Hash mismatch detected — the file content has changed since upload.
          </p>
        )}
      </div>

      {/* Anchoring status */}
      {result.anchored ? (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <p className="text-sm text-green-800">
            Document is anchored. Full cryptographic proof is available.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
          <span className="mt-0.5 text-yellow-600 shrink-0">ℹ</span>
          <p className="text-sm text-yellow-800">
            This document has not been anchored to the blockchain yet. Merkle and chain proofs are
            unavailable until an Admin or IO anchors the audit chain.
          </p>
        </div>
      )}
    </div>
  );
}

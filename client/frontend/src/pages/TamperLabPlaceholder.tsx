import React, { useState, useEffect } from 'react'
import { ShieldAlert, CheckCircle2, XCircle, Anchor, AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react'
import { api } from '../api/client'
import type { DocumentOut, VerifyResponse } from '../types'
import { useAuth } from '../context/AuthContext'

export const TamperLabPlaceholder: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [docs, setDocs] = useState<DocumentOut[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadDocs = async () => {
      if (!isAuthenticated) return
      try {
        const list = await api.listDocuments()
        setDocs(list)
        if (list.length > 0 && selectedDocId === null) {
          setSelectedDocId(list[0].id)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadDocs()
  }, [isAuthenticated])

  const handleVerify = async () => {
    if (!selectedDocId) return
    setLoading(true)
    try {
      const res = await api.verifyDocument(selectedDocId)
      setVerifyResult(res)
    } catch (err: any) {
      alert(`Verification check failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAnchor = async () => {
    try {
      const res = await api.anchorPending()
      setActionMsg(`Anchored into Block #${res.block_index || 'New'} (Root: ${res.merkle_root?.slice(0, 16)}...)`)
      handleVerify()
    } catch (err: any) {
      setActionMsg(`Anchor Notice: ${err.message}`)
    }
  }

  const handleTamper = async () => {
    if (!selectedDocId) return
    try {
      await api.tamperDemo(selectedDocId)
      setActionMsg('⚠️ Stored ciphertext blob on disk corrupted! Re-run verification to see tamper detection.')
    } catch (err: any) {
      setActionMsg(`Tamper action error: ${err.message}`)
    }
  }

  const handleRestore = async () => {
    if (!selectedDocId) return
    try {
      await api.restoreDemo(selectedDocId)
      setActionMsg('Original pristine blob restored from secure backup.')
      handleVerify()
    } catch (err: any) {
      setActionMsg(`Restore error: ${err.message}`)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert size={28} color="#ef4444" />
          <span>Forensic Integrity & Tamper Lab</span>
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Directly simulates disk-level tampering (bypassing application layers) and demonstrates live Merkle-root & SHA-256 integrity breakdown detection.
        </p>
      </div>

      {actionMsg && (
        <div
          className="glass-panel"
          style={{
            padding: '12px 16px',
            borderLeft: '4px solid #38bdf8',
            color: '#e2e8f0',
            fontSize: '0.85rem',
          }}
        >
          {actionMsg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px' }}>
        {/* Document Selection & Actions */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>Target Document</h3>
          <select
            className="input-control"
            value={selectedDocId || ''}
            onChange={(e) => {
              setSelectedDocId(Number(e.target.value))
              setVerifyResult(null)
            }}
            style={{ marginBottom: '20px' }}
          >
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id}: {d.title} ({d.doc_type})
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={handleAnchor} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
              <Anchor size={16} color="#38bdf8" />
              <span>1. Anchor Pending Entries into Merkle Block</span>
            </button>

            <button onClick={handleTamper} className="btn btn-crimson" style={{ justifyContent: 'flex-start' }}>
              <AlertTriangle size={16} />
              <span>2. Tamper (Corrupt Stored Blob on Disk)</span>
            </button>

            <button onClick={handleRestore} className="btn btn-ghost" style={{ justifyContent: 'flex-start' }}>
              <RotateCcw size={16} color="#10b981" />
              <span>3. Restore Original Pristine Blob</span>
            </button>

            <button
              onClick={handleVerify}
              disabled={loading || !selectedDocId}
              className="btn btn-primary"
              style={{ marginTop: '10px', padding: '12px' }}
            >
              <ShieldCheck size={18} />
              <span>{loading ? 'Recomputing Cryptographic Hashes...' : 'Run Forensic Verification'}</span>
            </button>
          </div>
        </div>

        {/* Verification Result Breakdown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px' }}>Integrity Verification Breakdown</h3>

          {verifyResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: verifyResult.overall_valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: verifyResult.overall_valid ? '1px solid #10b981' : '1px solid #ef4444',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {verifyResult.overall_valid ? <CheckCircle2 size={24} color="#10b981" /> : <XCircle size={24} color="#ef4444" />}
                <div>
                  <h4 style={{ color: verifyResult.overall_valid ? '#34d399' : '#f87171', fontSize: '1rem' }}>
                    {verifyResult.overall_valid ? 'OVERALL INTEGRITY: VALID' : 'ALERT: TAMPERING DETECTED'}
                  </h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {verifyResult.overall_valid
                      ? 'Stored hash matches disk recomputed SHA-256, Merkle inclusion proof valid, and audit chain unbroken.'
                      : 'Cryptographic hash mismatch. Disk contents differ from baseline recorded at upload time.'}
                  </p>
                </div>
              </div>

              {/* Hashes Comparison */}
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '2px' }}>RECORDED SHA-256 (BASELINE):</p>
                <code className="mono" style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {verifyResult.stored_hash}
                </code>

                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px', marginBottom: '2px' }}>
                  DISK RECOMPUTED SHA-256:
                </p>
                <code
                  className="mono"
                  style={{
                    fontSize: '0.78rem',
                    color: verifyResult.blob_intact ? '#34d399' : '#ef4444',
                    wordBreak: 'break-all',
                    fontWeight: 700,
                  }}
                >
                  {verifyResult.recomputed_hash}
                </code>
              </div>

              {/* Sub-checks list */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                  Blob Intact on Disk: {verifyResult.blob_intact ? '✅ YES' : '❌ CORRUPTED'}
                </div>
                <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                  Merkle Proof Valid: {verifyResult.merkle_proof_valid ? '✅ VALID' : '⏳ PENDING'}
                </div>
                <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                  Block Chain Valid: {verifyResult.chain_valid ? '✅ VALID' : '⏳ PENDING'}
                </div>
                <div style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.03)' }}>
                  Audit Chain Valid: {verifyResult.audit_chain_valid ? '✅ VALID' : '❌ BROKEN'}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Select a document and click "Run Forensic Verification" to inspect cryptographic parameters.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

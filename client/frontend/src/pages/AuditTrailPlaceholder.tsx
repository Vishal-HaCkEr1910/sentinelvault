import React, { useState, useEffect } from 'react'
import { GitBranch, CheckCircle2, XCircle, RefreshCw } from 'lucide-react'
import { api } from '../api/client'
import type { AuditEntryOut, AuditVerifyResponse } from '../types'
import { useAuth } from '../context/AuthContext'

export const AuditTrailPlaceholder: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [entries, setEntries] = useState<AuditEntryOut[]>([])
  const [verifyResult, setVerifyResult] = useState<AuditVerifyResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const loadChain = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    try {
      const chain = await api.getAuditChain()
      setEntries(chain)
      const verified = await api.verifyAuditChain()
      setVerifyResult(verified)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadChain()
  }, [isAuthenticated])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <GitBranch size={28} color="#a78bfa" />
            <span>Cryptographic Audit Trail</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Append-only hash chain where every record feeds into the subsequent entry's previous hash, signed individually with ECDSA.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadChain} className="btn btn-ghost" disabled={loading}>
            <RefreshCw size={15} />
            <span>Verify & Refresh</span>
          </button>
        </div>
      </div>

      {/* Chain Status Card */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {verifyResult?.valid ? (
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle2 size={24} color="#10b981" />
            </div>
          ) : (
            <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)' }}>
              <XCircle size={24} color="#ef4444" />
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '1.05rem', color: '#fff' }}>
              {verifyResult?.valid ? 'Hash Chain Integrity: 100% VALID' : 'Integrity Broken'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {verifyResult?.valid
                ? `All ${entries.length} consecutive entries match mathematical SHA-256 links and ECDSA signatures.`
                : `Tamper detected at sequence #${verifyResult?.broken_at_seq}: ${verifyResult?.reason}`}
            </p>
          </div>
        </div>

        <span className="badge badge-purple">{entries.length} Hash-Chained Entries</span>
      </div>

      {/* Entries Table */}
      <div className="glass-panel" style={{ padding: '20px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              <th style={{ padding: '10px 12px' }}>SEQ</th>
              <th style={{ padding: '10px 12px' }}>TIMESTAMP</th>
              <th style={{ padding: '10px 12px' }}>ACTOR</th>
              <th style={{ padding: '10px 12px' }}>ACTION</th>
              <th style={{ padding: '10px 12px' }}>DOC ID</th>
              <th style={{ padding: '10px 12px' }}>DETAILS</th>
              <th style={{ padding: '10px 12px' }}>ENTRY HASH</th>
              <th style={{ padding: '10px 12px' }}>ANCHORED</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.seq} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.82rem' }}>
                <td style={{ padding: '10px 12px', fontWeight: 700, color: '#38bdf8' }}>#{e.seq}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                  {new Date(e.timestamp * 1000).toLocaleTimeString()}
                </td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>{e.actor_username}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{e.action}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{e.document_id ? `#${e.document_id}` : '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{e.details}</td>
                <td style={{ padding: '10px 12px' }}>
                  <code className="mono" style={{ fontSize: '0.75rem', color: '#a78bfa' }}>
                    {e.entry_hash.slice(0, 12)}...
                  </code>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  {e.anchored ? <span className="badge badge-emerald">⚓ Block</span> : <span className="badge badge-amber">⏳ Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

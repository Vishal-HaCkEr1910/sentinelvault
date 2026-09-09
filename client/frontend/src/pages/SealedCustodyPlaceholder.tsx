import React, { useState, useEffect } from 'react'
import { KeyRound, Check, AlertCircle, Unlock, Lock } from 'lucide-react'
import { api, base64ToUtf8 } from '../api/client'
import type { DocumentOut } from '../types'
import { DEMO_PERSONAS } from '../types'
import { useAuth } from '../context/AuthContext'

export const SealedCustodyPlaceholder: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const [sealedDocs, setSealedDocs] = useState<DocumentOut[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [selectedCustodians, setSelectedCustodians] = useState<string[]>([])
  const [unsealResult, setUnsealResult] = useState<{ unlocked: boolean; content?: string; have: number; need: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadSealed = async () => {
      if (!isAuthenticated) return
      try {
        const docs = await api.listDocuments()
        const sealed = docs.filter((d) => d.is_sealed)
        setSealedDocs(sealed)
        if (sealed.length > 0 && selectedDocId === null) {
          setSelectedDocId(sealed[0].id)
        }
      } catch (err: any) {
        setErrorMessage(err.message)
      }
    }
    loadSealed()
  }, [isAuthenticated])

  const toggleCustodian = (username: string) => {
    setSelectedCustodians((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    )
  }

  const handleAttemptUnseal = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setErrorMessage(null)
    setUnsealResult(null)
    try {
      const res = await api.unsealDocument(selectedDocId, selectedCustodians)
      setUnsealResult({
        unlocked: res.unlocked,
        have: res.have,
        need: res.need,
        content: res.content_base64 ? base64ToUtf8(res.content_base64) : undefined,
      })
    } catch (err: any) {
      setErrorMessage(err.message || 'Unseal attempt failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <KeyRound size={28} color="#fbbf24" />
          <span>Threshold Custody (Shamir's Secret Sharing)</span>
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          High-value evidence is split into polynomial shares over GF(2⁸). No single judge or officer can unlock it alone — k-of-n designated custodians must jointly authorize.
        </p>
      </div>

      {errorMessage && (
        <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #ef4444', color: '#f87171' }}>
          {errorMessage}
        </div>
      )}

      {sealedDocs.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Lock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
          <p>No sealed documents visible in your assigned cases.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>
            Upload a document with the "Seal this document" flag checked to test Shamir threshold unsealing.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}>
          {/* Left: Select Sealed Doc */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '14px' }}>Select Sealed Case File</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sealedDocs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDocId(d.id)
                    setUnsealResult(null)
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: selectedDocId === d.id ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedDocId === d.id ? '1px solid #f59e0b' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>{d.title}</span>
                    <span className="badge badge-amber">{d.custody_k}-of-{d.custody_n} Threshold</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Document ID: #{d.id} · Uploader: {d.uploader_username}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Custodian Approvals & Unseal */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', color: '#fff', marginBottom: '12px' }}>
              Simulate Custodian Approvals
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Select approving custodians to provide their decrypted polynomial shares:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
              {DEMO_PERSONAS.map((p) => {
                const isSelected = selectedCustodians.includes(p.username)
                return (
                  <button
                    key={p.username}
                    type="button"
                    onClick={() => toggleCustodian(p.username)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: isSelected ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '1px solid #94a3b8',
                        background: isSelected ? '#10b981' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && <Check size={12} color="#fff" />}
                    </div>
                    <span style={{ fontSize: '0.78rem', color: isSelected ? '#fff' : 'var(--text-secondary)' }}>
                      {p.username}
                    </span>
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleAttemptUnseal}
              disabled={loading || selectedCustodians.length === 0}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              <Unlock size={16} />
              <span>
                Attempt Unseal ({selectedCustodians.length} Approvals Provided)
              </span>
            </button>

            {/* Unseal Result Display */}
            {unsealResult && (
              <div
                style={{
                  marginTop: '18px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: unsealResult.unlocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  border: unsealResult.unlocked ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {unsealResult.unlocked ? <Check size={18} color="#10b981" /> : <AlertCircle size={18} color="#f59e0b" />}
                  <span style={{ fontWeight: 700, color: unsealResult.unlocked ? '#34d399' : '#fbbf24', fontSize: '0.9rem' }}>
                    {unsealResult.unlocked
                      ? `SUCCESS: Lagrange Interpolation Completed (${unsealResult.have}/${unsealResult.need} shares)`
                      : `DENIED: Sub-threshold approvals (${unsealResult.have} of ${unsealResult.need} required)`}
                  </span>
                </div>

                {unsealResult.content && (
                  <div style={{ marginTop: '10px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>UNSEALED EVIDENCE PLAINTEXT:</p>
                    <pre style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'pre-wrap', marginTop: '4px' }}>
                      {unsealResult.content}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

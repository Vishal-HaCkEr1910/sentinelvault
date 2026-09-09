import React, { useState, useEffect } from 'react'
import { FileCheck2, CheckCircle2 } from 'lucide-react'
import { api } from '../api/client'
import type { DocumentOut } from '../types'
import { useAuth } from '../context/AuthContext'

export const CertificateStudioPlaceholder: React.FC = () => {
  const { isAuthenticated, user } = useAuth()
  const [docs, setDocs] = useState<DocumentOut[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null)
  const [generatedCert, setGeneratedCert] = useState<{ path: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated) return
      try {
        const list = await api.listDocuments()
        setDocs(list)
        if (list.length > 0 && selectedDocId === null) {
          setSelectedDocId(list[0].id)
        }
      } catch (err: any) {
        setError(err.message)
      }
    }
    load()
  }, [isAuthenticated])

  const handleGenerate = async () => {
    if (!selectedDocId) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.generateCertificate(selectedDocId)
      setGeneratedCert({ path: res.path })
    } catch (err: any) {
      setError(err.message || 'Failed to generate certificate')
    } finally {
      setLoading(false)
    }
  }

  const selectedDoc = docs.find((d) => d.id === selectedDocId)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileCheck2 size={28} color="#38bdf8" />
          <span>Section 63(4) BSA Hash Certificate Studio</span>
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Automated evidentiary hash certificate generator compliant with Section 63(4) of Bharatiya Sakshya Adhiniyam, 2023.
        </p>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #ef4444', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '16px' }}>
          Select Document for Legal Evidentiary Certification
        </h3>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
            Document Record
          </label>
          <select
            className="input-control"
            value={selectedDocId || ''}
            onChange={(e) => {
              setSelectedDocId(Number(e.target.value))
              setGeneratedCert(null)
            }}
          >
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                #{d.id} — {d.title} (Case #{d.case_id})
              </option>
            ))}
          </select>
        </div>

        {selectedDoc && (
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
              Certification Metadata Preview:
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Signatory: <strong style={{ color: '#e2e8f0' }}>{user?.fullName} ({user?.role})</strong>
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Document: {selectedDoc.title} · Type: {selectedDoc.doc_type}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Cryptographic Anchoring: {selectedDoc.anchored ? '✅ Anchored into Merkle Block' : '⏳ Pending Anchor Batch'}
            </p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedDocId}
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '0.95rem' }}
        >
          <FileCheck2 size={18} />
          <span>{loading ? 'Compiling Legal Certificate...' : 'Generate Section 63(4) Certificate PDF'}</span>
        </button>

        {generatedCert && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={22} color="#10b981" />
              <div>
                <p style={{ color: '#34d399', fontWeight: 700, fontSize: '0.9rem' }}>
                  Certificate Generated Successfully!
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  Saved to: <code className="mono" style={{ color: '#fff' }}>data/certificates/{generatedCert.path}</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

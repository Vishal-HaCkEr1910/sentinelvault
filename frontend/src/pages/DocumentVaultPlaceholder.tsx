import React, { useState, useEffect } from 'react'
import { FolderLock, Search, RefreshCw, FileText } from 'lucide-react'
import { api, base64ToUtf8 } from '../api/client'
import type { DocumentOut } from '../types'
import { useAuth } from '../context/AuthContext'

export const DocumentVaultPlaceholder: React.FC = () => {
  const { user, isAuthenticated } = useAuth()
  const [docs, setDocs] = useState<DocumentOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDocContent, setSelectedDocContent] = useState<{ id: number; content: string } | null>(null)

  const fetchDocs = async () => {
    if (!isAuthenticated) return
    setLoading(true)
    setError(null)
    try {
      if (searchQuery.trim()) {
        const results = await api.searchDocuments(searchQuery.trim())
        setDocs(results)
      } else {
        const results = await api.listDocuments()
        setDocs(results)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [isAuthenticated, searchQuery])

  const handleView = async (docId: number) => {
    try {
      const res = await api.retrieveDocument(docId)
      const text = base64ToUtf8(res.content_base64)
      setSelectedDocContent({ id: docId, content: text })
    } catch (err: any) {
      alert(`Access Denied: ${err.message}`)
    }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderLock size={28} color="#38bdf8" />
            <span>Document Vault</span>
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Envelope-encrypted legal and investigation records. Plaintext is only decryptable by authorized officers with valid RSA wrapped keys.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchDocs} className="btn btn-ghost" disabled={loading}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-control"
            style={{ paddingLeft: '40px' }}
            placeholder="Search documents by title, doc type, or encrypted tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '14px', borderLeft: '4px solid #ef4444', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Document List */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: '14px', color: '#fff' }}>
          Accessible Documents for {user?.fullName || 'Current User'} ({docs.length})
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Querying vault ciphertext keys...</p>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
            <p>No documents found matching your credentials or search filter.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {docs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>{doc.title}</span>
                    <span className="badge badge-cyan">{doc.doc_type}</span>
                    {doc.is_sealed && <span className="badge badge-amber">🔒 SEALED ({doc.custody_k}-of-{doc.custody_n})</span>}
                    {doc.anchored ? (
                      <span className="badge badge-emerald">⚓ Anchored</span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>
                        ⏳ Pending Anchor
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Case ID: #{doc.case_id} · Uploaded by: <code className="mono" style={{ color: '#38bdf8' }}>{doc.uploader_username}</code> · Created: {new Date(doc.created_at * 1000).toLocaleString()}
                  </p>
                </div>

                <div>
                  {!doc.is_sealed ? (
                    <button onClick={() => handleView(doc.id)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                      Decrypt & View
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontStyle: 'italic' }}>
                      Requires Shamir Unseal
                    </span>
                  )}
                </div>

                {selectedDocContent && selectedDocContent.id === doc.id && (
                  <div
                    style={{
                      width: '100%',
                      marginTop: '10px',
                      padding: '14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    <p style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                      Decrypted Plaintext (AES-256-GCM Verified):
                    </p>
                    <pre style={{ color: '#e2e8f0', fontSize: '0.85rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {selectedDocContent.content}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

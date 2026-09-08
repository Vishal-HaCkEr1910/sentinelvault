import React, { useState } from 'react'
import { X, Lock, Key, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { DEMO_PERSONAS } from '../types'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, quickLogin, isLoading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(username, password)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Invalid username or password')
    }
  }

  const handleQuickSelect = async (demoUsername: string) => {
    setError(null)
    try {
      await quickLogin(demoUsername)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Quick login failed')
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(4, 7, 12, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '620px',
          background: 'rgba(14, 20, 33, 0.95)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '28px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={22} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: '#fff' }}>Access SentinelVault</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Authenticate with your X.509 PKI identity credentials
            </p>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.85rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Select Grid for SIH Demo Personas */}
        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
              marginBottom: '10px',
            }}
          >
            One-Click Demo Personas (Password: password123)
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '8px',
            }}
          >
            {DEMO_PERSONAS.map((p) => (
              <button
                key={p.username}
                type="button"
                onClick={() => handleQuickSelect(p.username)}
                disabled={isLoading}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = p.badgeColor
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>{p.fullName}</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '3px',
                      background: `${p.badgeColor}22`,
                      color: p.badgeColor,
                    }}
                  >
                    {p.role}
                  </span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {p.casesDescription}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            margin: '20px 0',
          }}
        >
          <hr style={{ borderColor: 'var(--border-subtle)', borderTop: '1px solid var(--border-subtle)' }} />
          <span
            style={{
              position: 'absolute',
              top: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(14, 20, 33, 1)',
              padding: '0 12px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Or Enter Credentials
          </span>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Username
            </label>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. io_sharma, judge_mehta"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              className="input-control"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ marginTop: '8px', padding: '12px' }}
          >
            <Key size={16} />
            <span>{isLoading ? 'Verifying PKI Signature...' : 'Sign In with Certificate'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

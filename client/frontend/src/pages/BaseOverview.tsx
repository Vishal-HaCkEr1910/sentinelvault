import React, { useState, useEffect } from 'react'
import {
  Lock,
  Key,
  GitBranch,
  Layers,
  FileCheck2,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Cpu,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'
import type { NavTab } from '../components/layout/Sidebar'

interface BaseOverviewProps {
  onNavigate: (tab: NavTab) => void
  onOpenLogin: () => void
}

export const BaseOverview: React.FC<BaseOverviewProps> = ({ onNavigate, onOpenLogin }) => {
  const { user, isAuthenticated } = useAuth()
  const [healthStatus, setHealthStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [lastPingTime, setLastPingTime] = useState<string>('')

  const pingBackend = async () => {
    setHealthStatus('checking')
    try {
      await api.checkHealth()
      setHealthStatus('online')
      setLastPingTime(new Date().toLocaleTimeString())
    } catch {
      setHealthStatus('offline')
      setLastPingTime(new Date().toLocaleTimeString())
    }
  }

  useEffect(() => {
    pingBackend()
  }, [])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Hero Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '32px',
          background: 'linear-gradient(135deg, rgba(16, 24, 40, 0.9) 0%, rgba(14, 30, 56, 0.7) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ maxWidth: '750px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span className="badge badge-cyan">React + TypeScript Base Initialized</span>
              <span className="badge badge-emerald">SIH PS 26190</span>
            </div>
            <h1 style={{ fontSize: '2.1rem', marginBottom: '10px', fontWeight: 800 }}>
              SentinelVault Secure Digital Document Base
            </h1>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A zero-trust cryptographic evidence preservation platform for legal and investigation records.
              This React interface connects directly to your Python backend with{' '}
              <strong style={{ color: '#38bdf8' }}>zero backend changes</strong> via Vite proxy.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--border-glass)',
              }}
            >
              <Cpu size={16} color="#38bdf8" />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Backend: <code className="mono" style={{ color: '#fff' }}>FastAPI + SQLite</code>
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.8rem',
                color: healthStatus === 'online' ? '#34d399' : '#f87171',
              }}
            >
              <span className={`status-dot ${healthStatus === 'online' ? 'active' : 'tampered'}`} />
              <span>
                {healthStatus === 'online'
                  ? `FastAPI Proxy Online (${lastPingTime})`
                  : healthStatus === 'checking'
                  ? 'Connecting to backend...'
                  : 'Backend Disconnected (Run uvicorn)'}
              </span>
              <button
                onClick={pingBackend}
                className="btn btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                title="Ping again"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Active Identity Card */}
        {isAuthenticated && user ? (
          <div
            style={{
              marginTop: '24px',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1.1rem',
                }}
              >
                {user.fullName.charAt(0)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{user.fullName}</span>
                  <span className="badge badge-purple">{user.role}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {user.department} · Authenticated with ECDSA & RSA-OAEP keypair
                </p>
              </div>
            </div>

            <button onClick={() => onNavigate('documents')} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <span>Open Document Vault</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: '24px',
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="#fbbf24" />
              <div>
                <p style={{ fontWeight: 600, color: '#fef3c7', fontSize: '0.9rem' }}>
                  Currently Browsing Unauthenticated
                </p>
                <p style={{ fontSize: '0.78rem', color: '#d97706' }}>
                  Sign in with any demo persona to test RBAC and access encrypted documents.
                </p>
              </div>
            </div>
            <button onClick={onOpenLogin} className="btn btn-primary">
              Sign In with Demo Persona
            </button>
          </div>
        )}
      </div>

      {/* 5 Cryptographic Pillars */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem' }}>Cryptographic Enforcement Pillars</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Underlying security mechanisms verified in tests and enforced by the backend
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Card 1 */}
          <div className="glass-card-interactive" style={{ padding: '20px' }} onClick={() => onNavigate('documents')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', color: '#38bdf8' }}>
                <Lock size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>Envelope Encryption</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Each document receives a unique random AES-256-GCM DEK, RSA-wrapped separately for every authorized user.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>AES-256-GCM</span>
              <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Vault <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card-interactive" style={{ padding: '20px' }} onClick={() => onNavigate('custody')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                <Key size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>Threshold Custody</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Shamir's Secret Sharing over GF(2⁸) from scratch. Sealed documents require k-of-n custodians to jointly unlock.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>k-of-n Shamir</span>
              <span style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Custody <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card-interactive" style={{ padding: '20px' }} onClick={() => onNavigate('audit')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
                <GitBranch size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>Signed Hash Chain</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Every upload, retrieval, and access action is linked via SHA-256 hash chaining and signed with the actor's ECDSA key.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>ECDSA Chain</span>
              <span style={{ fontSize: '0.75rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Audit <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card-interactive" style={{ padding: '20px' }} onClick={() => onNavigate('verify')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <Layers size={18} />
              </div>
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>Blockchain Merkle Anchor</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Batches of audit events are Merkle-rooted into a signed block ledger with cryptographic inclusion proofs.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Merkle Tree</span>
              <span style={{ fontSize: '0.75rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Integrity <ArrowRight size={12} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Ready For Custom Pages Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '28px',
          background: 'rgba(14, 22, 38, 0.8)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileCheck2 size={20} color="#38bdf8" />
            <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>
              Frontend Scaffolding Complete & Ready For Your Pages!
            </h3>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '680px', lineHeight: 1.5 }}>
            The base architecture, types, API client, auth context, layout shell, and design system are all set up.
            Tell me which pages or user journeys you would like to build next (e.g. Document Explorer, Tamper Lab, Audit Visualizer, Certificate Generator).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onNavigate('documents')} className="btn btn-primary">
            <span>Explore Document Vault</span>
          </button>
        </div>
      </div>
    </div>
  )
}

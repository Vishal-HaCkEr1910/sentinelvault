import React, { useState, useEffect } from 'react'
import {
  Shield,
  LogOut,
  LogIn,
  ChevronDown,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { DEMO_PERSONAS } from '../../types'
import { api } from '../../api/client'

interface NavbarProps {
  onOpenLogin: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenLogin }) => {
  const { user, logout, quickLogin, isAuthenticated } = useAuth()
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [showPersonaMenu, setShowPersonaMenu] = useState<boolean>(false)

  // Live ping to verify API connectivity
  useEffect(() => {
    let mounted = true
    const checkApi = async () => {
      try {
        await api.checkHealth()
        if (mounted) setIsHealthy(true)
      } catch {
        if (mounted) setIsHealthy(false)
      }
    }
    checkApi()
    const interval = setInterval(checkApi, 10000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '68px',
        background: 'rgba(10, 14, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
      }}
    >
      {/* Brand & Emblem */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.3) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(6, 182, 212, 0.25)',
          }}
        >
          <Shield size={22} color="#38bdf8" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 50%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SentinelVault
            </span>
            <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
              SIH 26190
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Digital Evidence & Investigation Record System
          </p>
        </div>
      </div>

      {/* Right controls: Health Status, Persona Switcher, Login/Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* API Health Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
          }}
          title={isHealthy ? 'FastAPI backend connected (127.0.0.1:8000)' : 'Backend offline or waiting for uvicorn'}
        >
          <span
            className={`status-dot ${isHealthy ? 'active' : isHealthy === false ? 'tampered' : ''}`}
            style={{ width: '7px', height: '7px' }}
          />
          <span style={{ color: isHealthy ? '#34d399' : 'var(--text-muted)', fontWeight: 500 }}>
            {isHealthy ? 'API Online' : isHealthy === false ? 'API Offline' : 'Checking API...'}
          </span>
        </div>

        {/* Quick Demo Persona Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowPersonaMenu((prev) => !prev)}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <Sparkles size={15} color="#38bdf8" />
            <span>Switch Persona</span>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showPersonaMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                background: 'rgba(15, 22, 36, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-lg)',
                padding: '8px',
                boxShadow: 'var(--shadow-elevated)',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Select Demo Identity (SIH Persona)
                </p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Instantly tests RBAC & Cryptographic Key Scopes
                </p>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '6px 0' }}>
                {DEMO_PERSONAS.map((persona) => {
                  const isCurrent = user?.username === persona.username
                  return (
                    <button
                      key={persona.username}
                      onClick={async () => {
                        setShowPersonaMenu(false)
                        await quickLogin(persona.username)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isCurrent ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                        border: isCurrent ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>
                          {persona.fullName}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: `${persona.badgeColor}22`,
                            color: persona.badgeColor,
                          }}
                        >
                          {persona.role}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {persona.department} · {persona.casesDescription}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Badge or Login Button */}
        {isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              >
                {user.fullName.charAt(0)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                  {user.fullName}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>
                  {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn btn-outline"
              title="Sign out"
              style={{ padding: '8px', borderRadius: 'var(--radius-md)' }}
            >
              <LogOut size={16} color="var(--text-muted)" />
            </button>
          </div>
        ) : (
          <button onClick={onOpenLogin} className="btn btn-primary" style={{ padding: '8px 18px' }}>
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  )
}

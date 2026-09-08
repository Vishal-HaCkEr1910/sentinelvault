import React from 'react'
import {
  LayoutDashboard,
  FolderLock,
  GitBranch,
  KeyRound,
  ShieldAlert,
  FileCheck2,
  Lock,
  ChevronRight,
} from 'lucide-react'

export type NavTab = 'overview' | 'documents' | 'audit' | 'custody' | 'verify' | 'certificate'

interface SidebarProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
}

interface NavItem {
  id: NavTab
  label: string
  sublabel: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview & Health',
    sublabel: 'System Status & Cryptography',
    icon: LayoutDashboard,
  },
  {
    id: 'documents',
    label: 'Document Vault',
    sublabel: 'AES-256-GCM Envelope Access',
    icon: FolderLock,
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    sublabel: 'ECDSA Signed Hash Chain',
    icon: GitBranch,
  },
  {
    id: 'custody',
    label: 'Sealed Custody',
    sublabel: 'k-of-n Shamir Secret Sharing',
    icon: KeyRound,
  },
  {
    id: 'verify',
    label: 'Tamper & Integrity',
    sublabel: 'Merkle Ledger Verification',
    icon: ShieldAlert,
  },
  {
    id: 'certificate',
    label: 'BSA Certificate',
    sublabel: 'Section 63(4) Legal PDF',
    icon: FileCheck2,
  },
]

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <aside
      style={{
        width: '280px',
        flexShrink: 0,
        background: 'rgba(10, 14, 23, 0.7)',
        borderRight: '1px solid var(--border-glass)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 14px',
        minHeight: 'calc(100vh - 68px)',
      }}
    >
      <div>
        {/* Navigation Group Header */}
        <div style={{ padding: '0 10px 12px 10px' }}>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
            }}
          >
            Vault Modules
          </span>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)'
                    : 'transparent',
                  border: isActive
                    ? '1px solid rgba(56, 189, 248, 0.35)'
                    : '1px solid transparent',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Active Bar indicator */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '20%',
                      bottom: '20%',
                      width: '3px',
                      borderRadius: '0 4px 4px 0',
                      background: '#38bdf8',
                      boxShadow: '0 0 8px #38bdf8',
                    }}
                  />
                )}

                <div
                  style={{
                    color: isActive ? '#38bdf8' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon size={19} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.88rem',
                        color: isActive ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && <ChevronRight size={14} color="#38bdf8" />}
                  </div>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.sublabel}
                  </span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Security Specification Footer */}
      <div
        className="glass-panel"
        style={{
          padding: '14px',
          background: 'rgba(15, 22, 35, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Lock size={14} color="#10b981" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
            Zero-Trust Vault Active
          </span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          AES-256-GCM envelope keys & ECDSA Merkle logs enforced directly through Python backend.
        </p>
      </div>
    </aside>
  )
}

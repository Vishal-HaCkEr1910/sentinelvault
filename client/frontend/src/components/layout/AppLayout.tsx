import React from 'react'
import { Navbar } from './Navbar'
import { Sidebar, type NavTab } from './Sidebar'
import { LoginModal } from '../../pages/LoginModal'

interface AppLayoutProps {
  activeTab: NavTab
  onSelectTab: (tab: NavTab) => void
  isLoginOpen?: boolean
  setIsLoginOpen?: (open: boolean) => void
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  activeTab,
  onSelectTab,
  isLoginOpen = false,
  setIsLoginOpen,
  children,
}) => {
  const [internalLoginOpen, setInternalLoginOpen] = React.useState(false)

  const openModal = () => {
    if (setIsLoginOpen) setIsLoginOpen(true)
    else setInternalLoginOpen(true)
  }

  const closeModal = () => {
    if (setIsLoginOpen) setIsLoginOpen(false)
    else setInternalLoginOpen(false)
  }

  const isOpen = setIsLoginOpen ? isLoginOpen : internalLoginOpen

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar onOpenLogin={openModal} />

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 68px)' }}>
        <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />

        <main
          style={{
            flex: 1,
            padding: '32px 36px',
            overflowY: 'auto',
            minWidth: 0,
          }}
        >
          {children}
        </main>
      </div>

      <LoginModal isOpen={isOpen} onClose={closeModal} />
    </div>
  )
}

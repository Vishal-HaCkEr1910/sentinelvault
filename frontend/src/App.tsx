import React, { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import type { NavTab } from './components/layout/Sidebar'
import { BaseOverview } from './pages/BaseOverview'
import { DocumentVaultPlaceholder } from './pages/DocumentVaultPlaceholder'
import { AuditTrailPlaceholder } from './pages/AuditTrailPlaceholder'
import { SealedCustodyPlaceholder } from './pages/SealedCustodyPlaceholder'
import { TamperLabPlaceholder } from './pages/TamperLabPlaceholder'
import { CertificateStudioPlaceholder } from './pages/CertificateStudioPlaceholder'

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('overview')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <BaseOverview onNavigate={setActiveTab} onOpenLogin={() => setIsLoginModalOpen(true)} />
      case 'documents':
        return <DocumentVaultPlaceholder />
      case 'audit':
        return <AuditTrailPlaceholder />
      case 'custody':
        return <SealedCustodyPlaceholder />
      case 'verify':
        return <TamperLabPlaceholder />
      case 'certificate':
        return <CertificateStudioPlaceholder />
      default:
        return <BaseOverview onNavigate={setActiveTab} onOpenLogin={() => setIsLoginModalOpen(true)} />
    }
  }

  return (
    <AppLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      isLoginOpen={isLoginModalOpen}
      setIsLoginOpen={setIsLoginModalOpen}
    >
      {renderActiveView()}
    </AppLayout>
  )
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

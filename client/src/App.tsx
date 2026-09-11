import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';

// Agent 1 pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';

// Agent 2 pages
import DocumentsPage from '@/pages/DocumentsPage';
import UploadPage from '@/pages/UploadPage';
import SearchPage from '@/pages/SearchPage';
import DocumentDetailPage from '@/pages/DocumentDetailPage';

// Agent 3 pages
import DashboardPage from '@/pages/DashboardPage';
import AuditPage from '@/pages/AuditPage';
import CustodyPage from '@/pages/CustodyPage';
import VerifyPage from '@/pages/VerifyPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/upload" element={<UploadPage />} />
            <Route path="/documents/search" element={<SearchPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path="/documents/:id/verify" element={<VerifyPage />} />
            <Route path="/custody" element={<CustodyPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as documentsApi from '../api/documents';

export const DOCUMENT_KEYS = {
  all: ['documents'] as const,
  detail: (id: number) => ['documents', id] as const,
  search: (q: string) => ['documents', 'search', q] as const,
};

export function useDocuments() {
  return useQuery({
    queryKey: DOCUMENT_KEYS.all,
    queryFn: documentsApi.listDocuments,
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: DOCUMENT_KEYS.detail(id),
    queryFn: () => documentsApi.getDocument(id),
  });
}

export function useSearchDocuments(q: string) {
  return useQuery({
    queryKey: DOCUMENT_KEYS.search(q),
    queryFn: () => documentsApi.searchDocuments(q),
    enabled: q.length > 0,
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.uploadDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENT_KEYS.all }),
  });
}

export function useGenerateCertificate(id: number) {
  return useMutation({
    mutationFn: () => documentsApi.generateCertificate(id),
  });
}

export function useTamperDemo(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => documentsApi.tamperDemo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENT_KEYS.detail(id) }),
  });
}

export function useRestoreDemo(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => documentsApi.restoreDemo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: DOCUMENT_KEYS.detail(id) }),
  });
}

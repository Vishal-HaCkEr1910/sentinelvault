import { useQuery, useMutation } from '@tanstack/react-query';
import * as auditApi from '../api/audit';
import { anchorPending } from '../api/documents';

export const AUDIT_KEYS = {
  chain: (documentId?: number) => ['audit', documentId] as const,
};

export function useAuditChain(documentId?: number) {
  return useQuery({
    queryKey: AUDIT_KEYS.chain(documentId),
    queryFn: () => auditApi.getAuditChain(documentId),
  });
}

export function useVerifyAuditChain() {
  return useMutation({
    mutationFn: auditApi.verifyAuditChain,
  });
}

export function useAnchorPending() {
  return useMutation({
    mutationFn: anchorPending,
  });
}

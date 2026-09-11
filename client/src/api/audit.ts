import apiClient from '../lib/api-client';
import { AuditEntry, AuditVerifyResult } from './types';

export async function getAuditChain(documentId?: number): Promise<AuditEntry[]> {
  const params = documentId ? { document_id: documentId } : {};
  const res = await apiClient.get<AuditEntry[]>('/audit', { params });
  return res.data;
}

export async function verifyAuditChain(): Promise<AuditVerifyResult> {
  const res = await apiClient.get<AuditVerifyResult>('/audit/verify');
  return res.data;
}

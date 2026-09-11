import apiClient from '../lib/api-client';
import { Document, DocumentDetail, UploadRequest, VerifyResponse } from './types';

// List all accessible documents
export async function listDocuments(): Promise<Document[]> {
  const res = await apiClient.get<Document[]>('/documents');
  return res.data;
}

// Upload a new document
export async function uploadDocument(req: UploadRequest): Promise<Document> {
  const res = await apiClient.post<Document>('/documents/upload', req);
  return res.data;
}

// Encrypted keyword search
export async function searchDocuments(q: string): Promise<Document[]> {
  const res = await apiClient.get<Document[]>('/documents/search', { params: { q } });
  return res.data;
}

// Get single document with decrypted content
export async function getDocument(id: number): Promise<DocumentDetail> {
  const res = await apiClient.get<DocumentDetail>(`/documents/${id}`);
  return res.data;
}

// Verify document integrity
export async function verifyDocument(id: number): Promise<VerifyResponse> {
  const res = await apiClient.get<VerifyResponse>(`/documents/${id}/verify`);
  return res.data;
}

// Generate BSA certificate
export async function generateCertificate(id: number): Promise<{ filename: string }> {
  const res = await apiClient.post(`/documents/${id}/certificate`);
  return res.data;
}

// Demo: corrupt the document blob
export async function tamperDemo(id: number): Promise<void> {
  await apiClient.post(`/documents/${id}/tamper-demo`);
}

// Demo: restore the corrupted blob
export async function restoreDemo(id: number): Promise<void> {
  await apiClient.post(`/documents/${id}/restore-demo`);
}

// Anchor pending audit entries
export async function anchorPending(): Promise<{ block_index: number; anchored_count: number }> {
  const res = await apiClient.post('/anchor');
  return res.data;
}

import apiClient from '../lib/api-client';
import { UnsealResponse } from './types';

export async function unsealDocument(
  id: number,
  approving_custodians: string[]
): Promise<UnsealResponse> {
  const res = await apiClient.post<UnsealResponse>(`/custody/${id}/unseal`, {
    approving_custodians,
  });
  return res.data;
}

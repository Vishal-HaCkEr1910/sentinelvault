import apiClient from '../lib/api-client';
import { LoginResponse } from './types';

export async function login(username: string, password: string): Promise<LoginResponse> {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);

  const res = await apiClient.post<LoginResponse>('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

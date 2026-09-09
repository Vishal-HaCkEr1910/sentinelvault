import type {
  LoginResponse,
  DocumentOut,
  UploadRequest,
  UploadResponse,
  RetrieveResponse,
  VerifyResponse,
  AuditEntryOut,
  AuditVerifyResponse,
  UnsealRequest,
  UnsealResponse,
  AnchorResponse,
  CertificateResponse,
  HealthResponse,
} from '../types'

const TOKEN_KEY = 'sentinelvault_jwt_token'

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

// Base64 helpers for browser
export function utf8ToBase64(str: string): string {
  return window.btoa(unescape(encodeURIComponent(str)))
}

export function base64ToUtf8(base64: string): string {
  return decodeURIComponent(escape(window.atob(base64)))
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(options.headers || {})

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`
    try {
      const data = await res.json()
      if (data && data.detail) {
        errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)
      }
    } catch {
      // not JSON
    }
    throw new Error(errorDetail)
  }

  // Handle empty or text responses
  const contentType = res.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    return (await res.json()) as T
  }
  return (await res.text()) as unknown as T
}

export const api = {
  // Health
  checkHealth: (): Promise<HealthResponse> => request<HealthResponse>('/health'),

  // Auth (OAuth2 password form)
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const res = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })
    setStoredToken(res.access_token)
    return res
  },

  logout: (): void => {
    setStoredToken(null)
  },

  // Documents
  listDocuments: (): Promise<DocumentOut[]> => request<DocumentOut[]>('/documents'),

  searchDocuments: (query: string): Promise<DocumentOut[]> =>
    request<DocumentOut[]>(`/documents/search?q=${encodeURIComponent(query)}`),

  uploadDocument: (req: UploadRequest): Promise<UploadResponse> =>
    request<UploadResponse>('/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    }),

  retrieveDocument: (documentId: number): Promise<RetrieveResponse> =>
    request<RetrieveResponse>(`/documents/${documentId}`),

  verifyDocument: (documentId: number): Promise<VerifyResponse> =>
    request<VerifyResponse>(`/documents/${documentId}/verify`),

  tamperDemo: (documentId: number): Promise<{ status: string }> =>
    request<{ status: string }>(`/documents/${documentId}/tamper-demo`, {
      method: 'POST',
    }),

  restoreDemo: (documentId: number): Promise<{ status: string }> =>
    request<{ status: string }>(`/documents/${documentId}/restore-demo`, {
      method: 'POST',
    }),

  // Blockchain Anchoring
  anchorPending: (): Promise<AnchorResponse> =>
    request<AnchorResponse>('/anchor', { method: 'POST' }),

  // Audit
  getAuditChain: (documentId?: number): Promise<AuditEntryOut[]> => {
    const query = documentId ? `?document_id=${documentId}` : ''
    return request<AuditEntryOut[]>(`/audit${query}`)
  },

  verifyAuditChain: (): Promise<AuditVerifyResponse> =>
    request<AuditVerifyResponse>('/audit/verify'),

  // Custody (Shamir Unseal)
  unsealDocument: (
    documentId: number,
    approvingCustodians: string[]
  ): Promise<UnsealResponse> =>
    request<UnsealResponse>(`/custody/${documentId}/unseal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approving_custodians: approvingCustodians } as UnsealRequest),
    }),

  // Evidentiary Certificate
  generateCertificate: (documentId: number): Promise<CertificateResponse> =>
    request<CertificateResponse>(`/documents/${documentId}/certificate`, {
      method: 'POST',
    }),
}

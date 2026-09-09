export type Role =
  | 'InvestigatingOfficer'
  | 'Judge'
  | 'Prosecutor'
  | 'Clerk'
  | 'ForensicAnalyst'
  | 'Admin'

export interface DemoPersona {
  username: string
  fullName: string
  role: Role
  department: string
  casesDescription: string
  badgeColor: string
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    username: 'io_sharma',
    fullName: 'Insp. Sharma',
    role: 'InvestigatingOfficer',
    department: 'Cybercrime Cell',
    casesDescription: 'FIR-2024-1123',
    badgeColor: '#3b82f6', // blue
  },
  {
    username: 'io_verma',
    fullName: 'SI Verma',
    role: 'InvestigatingOfficer',
    department: 'Cybercrime Cell',
    casesDescription: 'FIR-2024-1123, FIR-2024-1198',
    badgeColor: '#0ea5e9', // sky
  },
  {
    username: 'prosecutor_rao',
    fullName: 'Adv. Rao',
    role: 'Prosecutor',
    department: 'State Prosecution',
    casesDescription: 'FIR-2024-1123',
    badgeColor: '#8b5cf6', // purple
  },
  {
    username: 'judge_mehta',
    fullName: 'Justice Mehta',
    role: 'Judge',
    department: 'District Court',
    casesDescription: 'Cross-Case Authority (All Cases)',
    badgeColor: '#f59e0b', // amber
  },
  {
    username: 'clerk_das',
    fullName: 'Clerk Das',
    role: 'Clerk',
    department: 'Court Registry',
    casesDescription: 'FIR-2024-1123, FIR-2024-1198',
    badgeColor: '#64748b', // slate
  },
  {
    username: 'forensic_iyer',
    fullName: 'Dr. Iyer',
    role: 'ForensicAnalyst',
    department: 'Forensic Science Lab',
    casesDescription: 'FIR-2024-1198',
    badgeColor: '#10b981', // emerald
  },
  {
    username: 'admin',
    fullName: 'System Admin',
    role: 'Admin',
    department: 'IT Cell',
    casesDescription: 'Full System Authority',
    badgeColor: '#ec4899', // pink
  },
]

export interface AuthUser {
  username: string
  fullName: string
  role: Role
  department?: string
  token: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  role: Role
  full_name: string
}

export interface DocumentOut {
  id: number
  case_id: number
  title: string
  doc_type: string
  uploader_username: string
  is_sealed: boolean
  custody_k: number | null
  custody_n: number | null
  anchored: boolean
  created_at: number
}

export interface UploadRequest {
  case_id: number
  title: string
  doc_type: string
  content_base64: string
  authorized_usernames?: string[]
  tags?: string
  sealed?: boolean
  custody_k?: number | null
  custodian_usernames?: string[]
}

export interface UploadResponse {
  document: DocumentOut
  ciphertext_sha256: string
}

export interface RetrieveResponse {
  document: DocumentOut
  content_base64: string
}

export interface VerifyResponse {
  document_id: number
  title: string
  stored_hash: string
  recomputed_hash: string
  blob_intact: boolean
  anchored: boolean
  merkle_proof_valid: boolean | null
  chain_valid: boolean | null
  audit_chain_valid: boolean
  overall_valid: boolean
}

export interface AuditEntryOut {
  seq: number
  actor_username: string
  action: string
  document_id: number | null
  details: string
  timestamp: number
  entry_hash: string
  prev_hash: string
  anchored: boolean
}

export interface AuditVerifyResponse {
  valid: boolean
  broken_at_seq: number | null
  reason: string | null
}

export interface UnsealRequest {
  approving_custodians: string[]
}

export interface UnsealResponse {
  unlocked: boolean
  have: number
  need: number
  content_base64?: string | null
}

export interface AnchorResponse {
  status: string
  block_index?: number
  merkle_root?: string
}

export interface CertificateResponse {
  status: string
  path: string
}

export interface HealthResponse {
  status: string
  service: string
}

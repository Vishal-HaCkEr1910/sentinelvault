export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  full_name: string;
}

export interface Document {
  id: number;
  case_id: number;
  title: string;
  doc_type: string;
  uploader_username: string;
  is_sealed: boolean;
  custody_k: number | null;
  custody_n: number | null;
  anchored: boolean;
  created_at: number;
}

export interface DocumentDetail extends Document {
  content_base64: string;
}

export interface UploadRequest {
  case_id: number;
  title: string;
  doc_type: string;
  content_base64: string;
  authorized_usernames: string[];
  tags: string;
  sealed: boolean;
  custody_k: number | null;
  custodian_usernames: string[];
}

export interface VerifyResponse {
  document_id: number;
  title: string;
  stored_hash: string;
  recomputed_hash: string;
  blob_intact: boolean;
  anchored: boolean;
  merkle_proof_valid: boolean | null;
  chain_valid: boolean | null;
  audit_chain_valid: boolean;
  overall_valid: boolean;
}

export interface AuditEntry {
  seq: number;
  actor_username: string;
  action: string;
  document_id: number | null;
  details: string;
  timestamp: number;
  entry_hash: string;
  prev_hash: string;
  anchored: boolean;
}

export interface AuditVerifyResult {
  valid: boolean;
  broken_at_seq: number | null;
  reason: string | null;
}

export interface UnsealResponse {
  unlocked: boolean;
  have: number;
  need: number;
  content_base64: string | null;
}

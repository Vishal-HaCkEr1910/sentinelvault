from __future__ import annotations

from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str


class DocumentOut(BaseModel):
    id: int
    case_id: int
    title: str
    doc_type: str
    uploader_username: str
    is_sealed: bool
    custody_k: int | None = None
    custody_n: int | None = None
    anchored: bool
    created_at: float


class UploadResponse(BaseModel):
    document: DocumentOut
    ciphertext_sha256: str


class RetrieveResponse(BaseModel):
    document: DocumentOut
    content_base64: str


class VerifyResponse(BaseModel):
    document_id: int
    title: str
    stored_hash: str
    recomputed_hash: str
    blob_intact: bool
    anchored: bool
    merkle_proof_valid: bool | None
    chain_valid: bool | None
    audit_chain_valid: bool
    overall_valid: bool


class AuditEntryOut(BaseModel):
    seq: int
    actor_username: str
    action: str
    document_id: int | None
    details: str
    timestamp: float
    entry_hash: str
    prev_hash: str
    anchored: bool


class UnsealRequest(BaseModel):
    approving_custodians: list[str]


class UnsealResponse(BaseModel):
    unlocked: bool
    have: int
    need: int
    content_base64: str | None = None


class UploadRequest(BaseModel):
    case_id: int
    title: str
    doc_type: str
    content_base64: str
    authorized_usernames: list[str] = []
    tags: str = ""
    sealed: bool = False
    custody_k: int | None = None
    custodian_usernames: list[str] = []

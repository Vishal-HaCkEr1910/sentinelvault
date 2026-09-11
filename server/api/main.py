"""
api/main.py
============
A thin FastAPI layer over core/services.py. This exists so the exact same
crypto/business logic that powers the Streamlit dashboard and the CLI demo
can also be consumed as a normal REST API — e.g. from the React frontend
described in the pitch deck, or from `curl`/Postman for grading.

Run:
    uvicorn api.main:app --reload --port 8000

Then see interactive docs at http://localhost:8000/docs
"""
from __future__ import annotations

import base64
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from core.db import init_db, get_session
from core.services import (
    AuthService, DocumentService, AuditService, CustodyService,
    VerificationService, CertificateService, bootstrap,
)
from core import access_control as ac
from api import schemas

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="SentinelVault API",
    description="Secure Digital Document Management System for Legal & Investigation Records — REST layer over the core crypto/service modules.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@app.on_event("startup")
def _startup():
    init_db()
    session = get_session()
    bootstrap(session)
    session.close()


def get_db():
    session = get_session()
    try:
        yield session
    finally:
        session.close()


def get_current_user(token: str = Depends(oauth2_scheme), session=Depends(get_db)):
    try:
        return AuthService.current_user_from_token(session, token)
    except ac.AccessDenied as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


def _doc_out(doc) -> schemas.DocumentOut:
    return schemas.DocumentOut(
        id=doc.id, case_id=doc.case_id, title=doc.title, doc_type=doc.doc_type,
        uploader_username=doc.uploader_username, is_sealed=doc.is_sealed,
        custody_k=doc.custody_k, custody_n=doc.custody_n, anchored=doc.anchored,
        created_at=doc.created_at, 
    )


def _handle_denied(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except ac.AccessDenied as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), session=Depends(get_db)):
    user = AuthService.authenticate(session, form.username, form.password)
    if not user:
        raise HTTPException(status_code=401, detail="invalid username or password")
    token = AuthService.issue_token(user)
    return schemas.LoginResponse(access_token=token, role=user.role, full_name=user.full_name)


# --------------------------------------------------------------------------
# Documents
# --------------------------------------------------------------------------

@app.get("/documents", response_model=list[schemas.DocumentOut])
def list_documents(user=Depends(get_current_user), session=Depends(get_db)):
    docs = DocumentService.list_documents(session, user)
    return [_doc_out(d) for d in docs]


@app.post("/documents/upload", response_model=schemas.UploadResponse)
def upload_document(req: schemas.UploadRequest, user=Depends(get_current_user), session=Depends(get_db)):
    plaintext = base64.b64decode(req.content_base64)
    doc = _handle_denied(
        DocumentService.upload_document, session, user, req.case_id, req.title, req.doc_type, plaintext,
        req.authorized_usernames, req.tags, req.sealed, req.custody_k, req.custodian_usernames or None,
    )
    return schemas.UploadResponse(document=_doc_out(doc), ciphertext_sha256=doc.ciphertext_sha256)


@app.get("/documents/search", response_model=list[schemas.DocumentOut])
def search_documents(q: str, user=Depends(get_current_user), session=Depends(get_db)):
    docs = DocumentService.search_documents(session, user, q)
    return [_doc_out(d) for d in docs]


@app.get("/documents/{document_id}", response_model=schemas.RetrieveResponse)
def retrieve_document(document_id: int, user=Depends(get_current_user), session=Depends(get_db)):
    plaintext, doc = _handle_denied(DocumentService.retrieve_document, session, user, document_id)
    return schemas.RetrieveResponse(document=_doc_out(doc), content_base64=base64.b64encode(plaintext).decode())


@app.get("/documents/{document_id}/verify", response_model=schemas.VerifyResponse)
def verify_document(document_id: int, user=Depends(get_current_user), session=Depends(get_db)):
    ac.check_permission(user, "verify")
    result = _handle_denied(VerificationService.verify_document_integrity, session, document_id)
    return schemas.VerifyResponse(
        document_id=result["document_id"], title=result["title"], stored_hash=result["stored_hash"],
        recomputed_hash=result["recomputed_hash"], blob_intact=result["blob_intact"], anchored=result["anchored"],
        merkle_proof_valid=result["merkle_proof_valid"], chain_valid=result["chain_valid"],
        audit_chain_valid=result["audit_chain_valid"], overall_valid=result["overall_valid"],
    )


@app.post("/documents/{document_id}/tamper-demo")
def tamper_demo(document_id: int, user=Depends(get_current_user), session=Depends(get_db)):
    ac.check_permission(user, "verify")  # demo action gated behind the same permission as verify
    _handle_denied(VerificationService.tamper_demo, session, document_id)
    return {"status": "tampered"}


@app.post("/documents/{document_id}/restore-demo")
def restore_demo(document_id: int, user=Depends(get_current_user), session=Depends(get_db)):
    ac.check_permission(user, "verify")
    _handle_denied(VerificationService.restore_demo, session, document_id)
    return {"status": "restored"}


@app.post("/anchor")
def anchor_pending(user=Depends(get_current_user), session=Depends(get_db)):
    block = _handle_denied(VerificationService.anchor_pending, session, user)
    if block is None:
        return {"status": "nothing pending"}
    return {"status": "anchored", "block_index": block.block_index, "merkle_root": block.merkle_root}


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------

@app.get("/audit", response_model=list[schemas.AuditEntryOut])
def get_audit_chain(document_id: int | None = None, user=Depends(get_current_user), session=Depends(get_db)):
    entries = AuditService.get_chain(session, document_id)
    return [
        schemas.AuditEntryOut(
            seq=e.seq, actor_username=e.actor_username, action=e.action, document_id=e.document_id,
            details=e.details, timestamp=e.timestamp, entry_hash=e.entry_hash, prev_hash=e.prev_hash,
            anchored=e.anchored,
        )
        for e in entries
    ]


@app.get("/audit/verify")
def verify_audit_chain(user=Depends(get_current_user), session=Depends(get_db)):
    result = AuditService.verify_full_chain(session)
    return {"valid": result.valid, "broken_at_seq": result.broken_at_seq, "reason": result.reason}


# --------------------------------------------------------------------------
# Custody (sealed documents)
# --------------------------------------------------------------------------

@app.post("/custody/{document_id}/unseal", response_model=schemas.UnsealResponse)
def unseal_document(document_id: int, req: schemas.UnsealRequest, user=Depends(get_current_user), session=Depends(get_db)):
    plaintext, doc, status_ = _handle_denied(
        CustodyService.attempt_unseal, session, user, document_id, req.approving_custodians
    )
    return schemas.UnsealResponse(
        unlocked=plaintext is not None, have=status_["have"], need=status_["need"],
        content_base64=base64.b64encode(plaintext).decode() if plaintext else None,
    )


# --------------------------------------------------------------------------
# Certificate
# --------------------------------------------------------------------------

@app.post("/documents/{document_id}/certificate")
def generate_certificate(document_id: int, user=Depends(get_current_user), session=Depends(get_db)):
    path = _handle_denied(CertificateService.generate, session, user, document_id)
    return {"status": "generated", "path": os.path.basename(path)}


@app.get("/health")
def health():
    return {"status": "ok", "service": "SentinelVault API"}

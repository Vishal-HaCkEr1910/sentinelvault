"""
models.py
=========
SQLAlchemy ORM models. SQLite by default (zero-setup for a hackathon demo —
swap the engine URL in db.py for PostgreSQL in a real deployment; nothing
above this layer needs to change).

A note on where keys live: for a *working demo* the server holds every
user's private keys (encrypted at rest under a single app-level secret) so
that upload/decrypt/sign can all happen without a browser-side crypto
component. This is a deliberate, documented simplification — see the
"Known Limitations" section of the README. A production deployment would
keep signing/decryption keys client-side (or in an HSM) and never let the
server see a private key at all.
"""
from __future__ import annotations

import datetime

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, Text, create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)          # e.g. InvestigatingOfficer, Judge, Prosecutor, Clerk, ForensicAnalyst, Admin
    department = Column(String, nullable=False)
    employee_id = Column(String, nullable=False)
    assigned_case_ids = Column(String, default="")  # comma-separated case ids (demo-simple; a join table in production)

    # PKI identity
    cert_pem = Column(Text, nullable=False)
    ec_private_pem = Column(Text, nullable=False)   # signing key (demo simplification, see module docstring)
    ec_public_pem = Column(Text, nullable=False)

    # Encryption keypair (separate from the signing keypair — standard practice)
    rsa_private_pem = Column(Text, nullable=False)
    rsa_public_pem = Column(Text, nullable=False)

    created_at = Column(Float, default=lambda: datetime.datetime.now().timestamp())

    def assigned_cases(self) -> list[int]:
        return [int(x) for x in self.assigned_case_ids.split(",") if x]


class CaseFile(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True)
    case_number = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(Float, default=lambda: datetime.datetime.now().timestamp())

    documents = relationship("Document", back_populates="case")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    title = Column(String, nullable=False)
    doc_type = Column(String, nullable=False)  # FIR, ChargeSheet, WitnessStatement, ForensicReport, CourtFiling, Evidence
    uploader_username = Column(String, nullable=False)

    blob_path = Column(String, nullable=False)   # path to encrypted ciphertext on disk
    nonce_hex = Column(String, nullable=False)
    ciphertext_sha256 = Column(String, nullable=False)  # recorded at upload time — the integrity baseline

    is_sealed = Column(Boolean, default=False)
    custody_k = Column(Integer, nullable=True)
    custody_n = Column(Integer, nullable=True)

    # anchoring status
    anchored = Column(Boolean, default=False)
    block_index = Column(Integer, nullable=True)
    audit_entry_seq_for_upload = Column(Integer, nullable=True)  # which audit entry's hash represents this doc's upload

    created_at = Column(Float, default=lambda: datetime.datetime.now().timestamp())

    case = relationship("CaseFile", back_populates="documents")
    wrapped_keys = relationship("WrappedKey", back_populates="document", cascade="all, delete-orphan")
    custody_shares = relationship("CustodyShare", back_populates="document", cascade="all, delete-orphan")


class WrappedKey(Base):
    """Envelope-encryption: this document's DEK, RSA-wrapped for one authorized user."""
    __tablename__ = "wrapped_keys"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    username = Column(String, nullable=False)
    wrapped_dek_hex = Column(Text, nullable=False)

    document = relationship("Document", back_populates="wrapped_keys")


class CustodyShare(Base):
    """One Shamir share of a sealed document's DEK, RSA-encrypted for one custodian."""
    __tablename__ = "custody_shares"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    custodian_username = Column(String, nullable=False)
    share_x = Column(Integer, nullable=False)
    encrypted_share_hex = Column(Text, nullable=False)  # RSA-OAEP(custodian_pubkey, share_bytes)

    document = relationship("Document", back_populates="custody_shares")


class AuditEntryRow(Base):
    __tablename__ = "audit_entries"

    id = Column(Integer, primary_key=True)
    seq = Column(Integer, unique=True, nullable=False)
    actor_username = Column(String, nullable=False)
    action = Column(String, nullable=False)
    document_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=False)
    timestamp = Column(Float, nullable=False)
    prev_hash = Column(String, nullable=False)
    entry_hash = Column(String, nullable=False)
    signature_hex = Column(Text, nullable=False)

    anchored = Column(Boolean, default=False)
    block_index = Column(Integer, nullable=True)


class BlockRow(Base):
    __tablename__ = "blocks"

    id = Column(Integer, primary_key=True)
    block_index = Column(Integer, unique=True, nullable=False)
    timestamp = Column(Float, nullable=False)
    merkle_root = Column(String, nullable=False)
    prev_block_hash = Column(String, nullable=False)
    block_hash = Column(String, nullable=False)
    signature_hex = Column(Text, nullable=False)
    leaf_hashes_json = Column(Text, nullable=False)  # ordered list, JSON — needed to rebuild Merkle proofs
    entry_ids_json = Column(Text, nullable=False)


class SearchIndexRow(Base):
    __tablename__ = "search_index"

    id = Column(Integer, primary_key=True)
    trapdoor_hex = Column(String, nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)


class NetworkKey(Base):
    """The single 'anchoring network' signing key used to sign blocks (see blockchain.py docstring)."""
    __tablename__ = "network_key"

    id = Column(Integer, primary_key=True)
    private_pem = Column(Text, nullable=False)
    public_pem = Column(Text, nullable=False)


class SearchKeyRow(Base):
    """System-wide HMAC key for the searchable encrypted index (searchable_index.py)."""
    __tablename__ = "search_key"

    id = Column(Integer, primary_key=True)
    key_hex = Column(String, nullable=False)

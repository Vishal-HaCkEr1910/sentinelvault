"""
hashchain.py
============
A tamper-evident, append-only audit log: every entry is hash-chained to the
one before it (exactly the mechanism git commits and blockchain blocks both
use), AND individually signed by the actor who performed the action.

Two independent tamper-evidence properties, deliberately layered:
    1. Hash chaining -> if ANY historical entry's content is altered, its
       hash changes, which breaks every entry after it (their prev_hash no
       longer matches). Detects "someone edited row 42 in the database."
    2. Per-entry ECDSA signature -> proves *who* actually performed the
       action, and that the entry content hasn't been forged even in
       isolation (not just "is the chain intact" but "did IO Sharma really
       sign off on this exact action").

`canonical_bytes()` is the one function most likely to bite you if edited
carelessly: signature and hash both depend on producing byte-identical
serialization every time, so we sort dict keys and use a fixed separator.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from core.crypto_utils import sha256_hex, ec_sign, ec_verify, load_private_key_from_pem, load_public_key_from_pem

GENESIS_HASH = "0" * 64


def canonical_bytes(entry_fields: dict) -> bytes:
    """Deterministic JSON serialization — order-independent input, byte-identical output."""
    return json.dumps(entry_fields, sort_keys=True, separators=(",", ":")).encode()


@dataclass
class AuditEntry:
    seq: int
    actor_username: str
    action: str
    document_id: int | None
    details: str
    timestamp: float
    prev_hash: str
    entry_hash: str = field(default="")
    signature_hex: str = field(default="")

    def content_fields(self) -> dict:
        """Everything that goes INTO the hash (excludes the hash/signature themselves)."""
        return {
            "seq": self.seq,
            "actor_username": self.actor_username,
            "action": self.action,
            "document_id": self.document_id,
            "details": self.details,
            "timestamp": self.timestamp,
            "prev_hash": self.prev_hash,
        }

    def compute_hash(self) -> str:
        return sha256_hex(canonical_bytes(self.content_fields()))


def create_entry(
    seq: int,
    prev_hash: str,
    actor_username: str,
    action: str,
    document_id: int | None,
    details: str,
    signer_private_key_pem: str,
) -> AuditEntry:
    """Build a new entry, chain it to `prev_hash`, and sign it with the actor's EC key."""
    entry = AuditEntry(
        seq=seq,
        actor_username=actor_username,
        action=action,
        document_id=document_id,
        details=details,
        timestamp=time.time(),
        prev_hash=prev_hash,
    )
    entry.entry_hash = entry.compute_hash()
    private_key = load_private_key_from_pem(signer_private_key_pem)
    signature = ec_sign(private_key, bytes.fromhex(entry.entry_hash))
    entry.signature_hex = signature.hex()
    return entry


@dataclass
class ChainVerificationResult:
    valid: bool
    broken_at_seq: int | None = None
    reason: str | None = None


def verify_chain(entries: list[AuditEntry], signer_public_keys_pem: dict[str, str]) -> ChainVerificationResult:
    """
    Walk the whole chain from genesis, checking:
        - each entry's stored hash matches a fresh recomputation
        - each entry's prev_hash matches the previous entry's actual hash
        - each entry's signature verifies against its claimed signer

    `signer_public_keys_pem` maps actor_username -> their PEM public key, so
    a forged entry claiming to be "signed by IO Sharma" with someone else's
    key gets caught even if the hash chain itself is internally consistent.
    """
    expected_prev = GENESIS_HASH
    for entry in entries:
        if entry.prev_hash != expected_prev:
            return ChainVerificationResult(False, entry.seq, f"prev_hash mismatch at seq {entry.seq}: chain broken")
        recomputed = entry.compute_hash()
        if recomputed != entry.entry_hash:
            return ChainVerificationResult(False, entry.seq, f"entry_hash mismatch at seq {entry.seq}: content was altered after signing")
        pub_pem = signer_public_keys_pem.get(entry.actor_username)
        if pub_pem is None:
            return ChainVerificationResult(False, entry.seq, f"unknown signer '{entry.actor_username}' at seq {entry.seq}")
        pub_key = load_public_key_from_pem(pub_pem)
        if not ec_verify(pub_key, bytes.fromhex(entry.entry_hash), bytes.fromhex(entry.signature_hex)):
            return ChainVerificationResult(False, entry.seq, f"signature invalid at seq {entry.seq}: forged or corrupted")
        expected_prev = entry.entry_hash
    return ChainVerificationResult(True)

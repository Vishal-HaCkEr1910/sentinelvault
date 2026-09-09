"""
storage.py
==========
Encrypted-blob storage on the local filesystem — the demo stand-in for
MinIO/S3-compatible object storage described in the architecture (swapping
this module for a real `boto3`/MinIO client is the only change needed to
move to real object storage; nothing else in the codebase touches the
filesystem directly).

Every blob is written with a `.bak` sibling copy at upload time. That's not
part of the "real" architecture — it exists purely so the live demo can
repeatedly tamper -> verify -> restore -> verify without needing to
re-upload a document each time.
"""
from __future__ import annotations

import os
import uuid

BLOB_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "blobs")
os.makedirs(BLOB_DIR, exist_ok=True)


def save_blob(ciphertext: bytes) -> str:
    """Write ciphertext to a new file, plus a `.bak` backup. Returns the path."""
    filename = f"{uuid.uuid4().hex}.bin"
    path = os.path.join(BLOB_DIR, filename)
    with open(path, "wb") as f:
        f.write(ciphertext)
    with open(path + ".bak", "wb") as f:
        f.write(ciphertext)
    return path


def load_blob(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def tamper_blob(path: str) -> None:
    """
    DEMO ONLY: flip one byte in the stored ciphertext to simulate an insider
    (or attacker with raw storage access) altering evidence after the fact.
    Does NOT touch the `.bak` backup, so `restore_blob` can undo this.
    """
    with open(path, "rb") as f:
        data = bytearray(f.read())
    if not data:
        return
    data[0] ^= 0xFF
    with open(path, "wb") as f:
        f.write(bytes(data))


def restore_blob(path: str) -> None:
    """DEMO ONLY: restore the original ciphertext from the `.bak` backup."""
    backup = path + ".bak"
    if os.path.exists(backup):
        with open(backup, "rb") as f:
            data = f.read()
        with open(path, "wb") as f:
            f.write(data)

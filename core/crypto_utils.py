"""
crypto_utils.py
================
Low-level cryptographic primitives used throughout SentinelVault.

Everything here wraps the `cryptography` (pyca) library — no home-grown
implementations of AES, RSA, or ECDSA. The only hand-rolled primitive in the
whole project is Shamir's Secret Sharing (see secret_sharing.py), because
`cryptography` doesn't ship one.

Primitives:
    - AES-256-GCM  -> bulk document encryption (authenticated: tamper in the
                       ciphertext is *rejected at decrypt time*, not just
                       silently decrypted into garbage).
    - RSA-OAEP     -> envelope-encryption key wrapping (wrap/unwrap a
                       document's AES key for each authorized user).
    - ECDSA P-256  -> signing audit-log entries and blocks (authenticity +
                       non-repudiation).
    - SHA-256      -> hashing documents, log entries, and Merkle leaves.
"""
from __future__ import annotations

import hashlib
import os
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.asymmetric import rsa, ec, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.exceptions import InvalidSignature

# --------------------------------------------------------------------------
# Hashing
# --------------------------------------------------------------------------

def sha256_hex(data: bytes) -> str:
    """Return the hex-encoded SHA-256 digest of `data`."""
    return hashlib.sha256(data).hexdigest()


def sha256_bytes(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


# --------------------------------------------------------------------------
# AES-256-GCM (authenticated symmetric encryption — the "envelope" content)
# --------------------------------------------------------------------------

def generate_dek() -> bytes:
    """Generate a fresh random 256-bit Data Encryption Key."""
    return os.urandom(32)


def aes_encrypt(key: bytes, plaintext: bytes, aad: bytes | None = None) -> tuple[bytes, bytes]:
    """
    Encrypt `plaintext` with AES-256-GCM.

    Returns (nonce, ciphertext). `ciphertext` includes the GCM authentication
    tag appended by the library — any single-byte tamper to it will make
    decryption raise InvalidTag, which is exactly the tamper-evidence
    property the whole "verify integrity" demo depends on.
    """
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce, standard for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext, aad)
    return nonce, ciphertext


def aes_decrypt(key: bytes, nonce: bytes, ciphertext: bytes, aad: bytes | None = None) -> bytes:
    """Decrypt + authenticate. Raises cryptography.exceptions.InvalidTag on tamper."""
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, aad)


# --------------------------------------------------------------------------
# RSA-OAEP (key-wrapping for envelope encryption)
# --------------------------------------------------------------------------

def generate_rsa_keypair(key_size: int = 3072):
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    return private_key, private_key.public_key()


def rsa_wrap_key(public_key, dek: bytes) -> bytes:
    """Encrypt (wrap) a DEK under a user's RSA public key with OAEP/SHA-256."""
    return public_key.encrypt(
        dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def rsa_unwrap_key(private_key, wrapped_dek: bytes) -> bytes:
    return private_key.decrypt(
        wrapped_dek,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


# --------------------------------------------------------------------------
# ECDSA P-256 (signing — audit log entries, blocks, certificates)
# --------------------------------------------------------------------------

def generate_ec_keypair():
    private_key = ec.generate_private_key(ec.SECP256R1())
    return private_key, private_key.public_key()


def ec_sign(private_key, data: bytes) -> bytes:
    return private_key.sign(data, ec.ECDSA(hashes.SHA256()))


def ec_verify(public_key, data: bytes, signature: bytes) -> bool:
    try:
        public_key.verify(signature, data, ec.ECDSA(hashes.SHA256()))
        return True
    except InvalidSignature:
        return False


# --------------------------------------------------------------------------
# PEM (de)serialization helpers — keys are persisted to SQLite as PEM text
# --------------------------------------------------------------------------

def private_key_to_pem(private_key) -> str:
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()


def public_key_to_pem(public_key) -> str:
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode()


def load_private_key_from_pem(pem: str):
    return serialization.load_pem_private_key(pem.encode(), password=None)


def load_public_key_from_pem(pem: str):
    return serialization.load_pem_public_key(pem.encode())


@dataclass
class Keypair:
    """Small convenience container so callers don't juggle two return values."""
    private_key: object
    public_key: object

    @property
    def private_pem(self) -> str:
        return private_key_to_pem(self.private_key)

    @property
    def public_pem(self) -> str:
        return public_key_to_pem(self.public_key)


def new_rsa_keypair(key_size: int = 3072) -> Keypair:
    priv, pub = generate_rsa_keypair(key_size)
    return Keypair(priv, pub)


def new_ec_keypair() -> Keypair:
    priv, pub = generate_ec_keypair()
    return Keypair(priv, pub)

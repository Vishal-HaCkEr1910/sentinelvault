"""
pki.py
======
A minimal internal Certificate Authority for SentinelVault.

In production this would be a real CA (or an integration with one) issuing
certs to hardware tokens/smart cards. For the hackathon build we stand up a
self-signed root CA at first run and have it issue short-lived-in-spirit
(long-lived-in-practice, for demo purposes) X.509 certificates to every
officer, binding their identity to:
    - role            (e.g. "InvestigatingOfficer", "Judge")
    - department       (e.g. "Cybercrime Cell")
    - employee_id

Those three attributes are what the access-control engine (access_control.py)
reads back out of a user's certificate to make authorization decisions — so
"who can see this document" is ultimately traceable to a CA-signed identity,
not just a database row someone could edit directly.

We store role/department/employee_id inside a custom X.509 extension (a
private OID under an internal arc) as a small JSON blob. This is a standard,
valid way to carry application-specific attributes in a certificate without
needing a full ASN.1 schema.
"""
from __future__ import annotations

import datetime
import json
import os
from dataclasses import dataclass

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID, ObjectIdentifier

from core import crypto_utils as cu

# Private enterprise OID arc for SentinelVault attributes (not IANA-registered;
# fine for an internal/demo CA — a real deployment would register one).
ATTRS_OID = ObjectIdentifier("1.3.6.1.4.1.55555.1.1")

CA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "ca")
CA_KEY_PATH = os.path.join(CA_DIR, "root_ca_key.pem")
CA_CERT_PATH = os.path.join(CA_DIR, "root_ca_cert.pem")


def _ensure_ca_dir():
    os.makedirs(CA_DIR, exist_ok=True)


def _build_root_ca():
    """Generate (once) a self-signed root CA keypair + certificate."""
    _ensure_ca_dir()
    keypair = cu.new_ec_keypair()
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SentinelVault Root CA"),
        x509.NameAttribute(NameOID.COMMON_NAME, "SentinelVault Internal Root CA"),
    ])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(keypair.public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(days=1))
        .not_valid_after(now + datetime.timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, key_cert_sign=True, crl_sign=True,
                content_commitment=False, key_encipherment=False, data_encipherment=False,
                key_agreement=False, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .sign(keypair.private_key, hashes.SHA256())
    )
    with open(CA_KEY_PATH, "w") as f:
        f.write(keypair.private_pem)
    with open(CA_CERT_PATH, "w") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM).decode())
    return keypair.private_key, cert


def get_or_create_root_ca():
    """Load the root CA from disk, creating it on first run."""
    if os.path.exists(CA_KEY_PATH) and os.path.exists(CA_CERT_PATH):
        with open(CA_KEY_PATH) as f:
            private_key = cu.load_private_key_from_pem(f.read())
        with open(CA_CERT_PATH) as f:
            cert = x509.load_pem_x509_certificate(f.read().encode())
        return private_key, cert
    return _build_root_ca()


@dataclass
class IssuedIdentity:
    """A signing keypair + the CA-issued certificate binding it to a role."""
    signing_keypair: cu.Keypair
    certificate_pem: str
    serial_number: int


def issue_certificate(
    common_name: str,
    role: str,
    department: str,
    employee_id: str,
    valid_days: int = 365,
) -> IssuedIdentity:
    """
    Issue a new X.509 certificate for a user, signed by the SentinelVault
    root CA, binding their public signing key to role/department/employee_id.
    """
    ca_key, ca_cert = get_or_create_root_ca()
    user_keypair = cu.new_ec_keypair()

    attrs_json = json.dumps({
        "role": role,
        "department": department,
        "employee_id": employee_id,
    }).encode()

    subject = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "IN"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "SentinelVault"),
        x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, department),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(ca_cert.subject)
        .public_key(user_keypair.public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=valid_days))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True, content_commitment=True, key_encipherment=False,
                data_encipherment=False, key_agreement=False, key_cert_sign=False,
                crl_sign=False, encipher_only=False, decipher_only=False,
            ),
            critical=True,
        )
        .add_extension(x509.UnrecognizedExtension(ATTRS_OID, attrs_json), critical=False)
        .sign(ca_key, hashes.SHA256())
    )
    cert_pem = cert.public_bytes(serialization.Encoding.PEM).decode()
    return IssuedIdentity(user_keypair, cert_pem, cert.serial_number)


def verify_certificate_chain(cert_pem: str) -> bool:
    """
    Verify that a certificate was genuinely signed by the SentinelVault root CA
    (i.e. the identity is not self-asserted / forged).
    """
    _, ca_cert = get_or_create_root_ca()
    cert = x509.load_pem_x509_certificate(cert_pem.encode())
    try:
        ca_cert.public_key().verify(
            cert.signature,
            cert.tbs_certificate_bytes,
            ec.ECDSA(cert.signature_hash_algorithm),
        )
        return True
    except Exception:
        return False


def read_attributes(cert_pem: str) -> dict:
    """Pull the role/department/employee_id JSON blob back out of a cert."""
    cert = x509.load_pem_x509_certificate(cert_pem.encode())
    ext = cert.extensions.get_extension_for_oid(ATTRS_OID)
    return json.loads(ext.value.value)

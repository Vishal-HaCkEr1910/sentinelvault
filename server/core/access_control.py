"""
access_control.py
==================
The RBAC policy engine. Two layers of enforcement, deliberately redundant:

    1. ROLE PERMISSIONS — can this *role* perform this *action* at all?
    2. CASE SCOPING — even if the role is allowed, is this *specific user*
       assigned to the *specific case* this document belongs to?

A third, stronger layer exists below this one but isn't part of this
module: for non-sealed documents, decryption additionally requires an
actual WrappedKey row for that user (see services.py) — so even a bug in
this policy engine can't leak plaintext to someone who was never issued a
key at upload time. Defense in depth: app-layer policy AND ciphertext-layer
enforcement, not just one or the other.
"""
from __future__ import annotations

# Roles with authority across ALL cases, not just ones they're explicitly
# assigned to (mirrors real judicial/administrative oversight authority).
CROSS_CASE_ROLES = {"Judge", "Admin"}

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "Admin": {
        "upload", "view", "list", "search", "seal", "custody_participate",
        "anchor", "verify", "manage_users", "generate_certificate",
    },
    "InvestigatingOfficer": {
        "upload", "view", "list", "search", "seal", "custody_participate", "verify", "generate_certificate",
    },
    "ForensicAnalyst": {
        "upload", "view", "list", "search", "custody_participate", "verify",
    },
    "Prosecutor": {
        "view", "list", "search", "custody_participate", "verify", "generate_certificate",
    },
    "Judge": {
        "view", "list", "search", "custody_participate", "verify", "anchor", "generate_certificate",
    },
    "Clerk": {
        "upload", "view", "list", "search", "generate_certificate",
    },
}


class AccessDenied(PermissionError):
    pass


def role_allows(role: str, action: str) -> bool:
    return action in ROLE_PERMISSIONS.get(role, set())


def check_permission(user, action: str) -> None:
    """Role-level check only (no document/case context needed)."""
    if not role_allows(user.role, action):
        raise AccessDenied(f"role '{user.role}' is not permitted to perform '{action}'")


def check_document_access(user, document, action: str) -> None:
    """Role-level check PLUS case-scoping for a specific document."""
    check_permission(user, action)
    if user.role in CROSS_CASE_ROLES:
        return
    if document.case_id not in user.assigned_cases():
        raise AccessDenied(
            f"user '{user.username}' is not assigned to case {document.case_id} "
            f"(required for action '{action}' on document {document.id})"
        )

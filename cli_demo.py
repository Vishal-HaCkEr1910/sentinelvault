"""
cli_demo.py
===========
A scripted, narrated walkthrough of the ENTIRE system end to end — no UI
needed. This is the fastest way to prove to yourself (or to a judge looking
over your shoulder in the terminal) that the cryptography is actually doing
real work, not just printing green checkmarks.

    python seed.py      # once
    python cli_demo.py

Mirrors the demo script in the pitch deck:
    1. Login as an Investigating Officer, upload a normal case document.
    2. Login as a second IO, upload a SEALED document with 3-of-5 custody.
    3. Show the hash-chained audit trail and verify it.
    4. Anchor pending entries into the block ledger.
    5. Verify document integrity (should PASS).
    6. Run the tamper demo, verify again (should FAIL) — the money shot.
    7. Restore the original, verify again (should PASS again).
    8. Attempt to unseal the sealed document with too few custodians (fails),
       then with enough (succeeds).
    9. Generate a hash certificate PDF.
"""
from __future__ import annotations

import os
import sys
import textwrap

sys.path.insert(0, os.path.dirname(__file__))

from core.db import init_db, get_session
from core.services import (
    AuthService, DocumentService, AuditService, CustodyService,
    VerificationService, CertificateService, bootstrap,
)
from core import access_control as ac


def hr(title=""):
    print("\n" + "=" * 78)
    if title:
        print(f"  {title}")
        print("=" * 78)


def bullet(label, value):
    print(f"  {label:32s} {value}")


def main():
    init_db()
    session = get_session()
    bootstrap(session)

    from core.models import User
    if session.query(User).count() == 0:
        print("No users found — run `python seed.py` first.")
        return

    hr("STEP 1 — Login as Investigating Officer (io_sharma) and upload a document")
    io_sharma = AuthService.authenticate(session, "io_sharma", "password123")
    token = AuthService.issue_token(io_sharma)
    print(f"  Logged in as {io_sharma.full_name} ({io_sharma.role}); JWT issued.")

    content = textwrap.dedent("""
        FIRST INFORMATION REPORT
        Case: FIR-2024-1123
        Date: 2024-03-14
        Complainant alleges unauthorized transfer of funds via phishing link
        sent to registered email. Preliminary IP trace points to a VPN exit
        node in a third-party jurisdiction. Section 66C/66D IT Act invoked.
    """).strip().encode()

    doc = DocumentService.upload_document(
        session, io_sharma, case_id=io_sharma.assigned_cases()[0], title="FIR - Phishing Fund Transfer",
        doc_type="FIR", plaintext=content,
        authorized_usernames=["io_sharma", "io_verma", "prosecutor_rao", "clerk_das"],
        tags="phishing IT-Act cyberfraud",
    )
    bullet("Document ID:", doc.id)
    bullet("Ciphertext SHA-256:", doc.ciphertext_sha256)
    bullet("Stored at:", doc.blob_path)
    bullet("Authorized users:", "io_sharma, io_verma, prosecutor_rao, clerk_das")

    hr("STEP 2 — Login as a second IO and upload a SEALED document (3-of-5 custody)")
    io_verma = AuthService.authenticate(session, "io_verma", "password123")
    sealed_content = b"SEALED EVIDENCE LOG - Forensic image hash list, chain-of-custody restricted."
    sealed_doc = DocumentService.upload_document(
        session, io_verma, case_id=io_verma.assigned_cases()[0], title="Sealed Evidence Log",
        doc_type="Evidence", plaintext=sealed_content, authorized_usernames=[],
        tags="evidence sealed forensic", sealed=True, custody_k=3,
        custodian_usernames=["io_sharma", "io_verma", "prosecutor_rao", "judge_mehta", "forensic_iyer"],
    )
    bullet("Sealed Document ID:", sealed_doc.id)
    bullet("Custody scheme:", f"{sealed_doc.custody_k}-of-{sealed_doc.custody_n}")
    bullet("Custodians:", "io_sharma, io_verma, prosecutor_rao, judge_mehta, forensic_iyer")

    hr("STEP 3 — Hash-chained audit trail")
    chain = AuditService.get_chain(session)
    for e in chain:
        bullet(f"  [{e.seq}] {e.action:12s} by {e.actor_username:14s}", e.entry_hash[:24] + "...")
    result = AuditService.verify_full_chain(session)
    print(f"\n  Chain verification: {'PASS ✅' if result.valid else 'FAIL ❌ — ' + str(result.reason)}")

    hr("STEP 4 — Anchor pending audit entries into the block ledger")
    admin = AuthService.authenticate(session, "admin", "password123")
    block = VerificationService.anchor_pending(session, admin)
    if block:
        bullet("New block index:", block.block_index)
        bullet("Merkle root:", block.merkle_root)
        bullet("Block hash:", block.block_hash)
        bullet("Entries anchored:", len(__import__("json").loads(block.entry_ids_json)))

    hr("STEP 5 — Verify document integrity (should PASS — nothing tampered yet)")
    v1 = VerificationService.verify_document_integrity(session, doc.id)
    bullet("Blob intact:", v1["blob_intact"])
    bullet("Merkle proof valid:", v1["merkle_proof_valid"])
    bullet("Block chain valid:", v1["chain_valid"])
    bullet("Audit chain valid:", v1["audit_chain_valid"])
    bullet("OVERALL:", "VALID ✅" if v1["overall_valid"] else "INVALID ❌")

    hr("STEP 6 — 🔨 TAMPER DEMO: corrupt the stored ciphertext directly on disk")
    VerificationService.tamper_demo(session, doc.id)
    print("  (flipped a byte in the stored blob file, bypassing the application entirely)")
    v2 = VerificationService.verify_document_integrity(session, doc.id)
    bullet("Blob intact:", v2["blob_intact"])
    bullet("Recomputed hash:", v2["recomputed_hash"])
    bullet("Stored hash:     ", v2["stored_hash"])
    bullet("OVERALL:", "VALID ✅" if v2["overall_valid"] else "INVALID ❌ — TAMPERING DETECTED")

    hr("STEP 7 — Restore original content and re-verify (should PASS again)")
    VerificationService.restore_demo(session, doc.id)
    v3 = VerificationService.verify_document_integrity(session, doc.id)
    bullet("OVERALL:", "VALID ✅" if v3["overall_valid"] else "INVALID ❌")

    hr("STEP 8 — Attempt threshold unseal of the sealed document")
    print("  Attempt 1: only 2 of 5 custodians approve (need 3) — should be REFUSED")
    pt, _, status = CustodyService.attempt_unseal(session, io_verma, sealed_doc.id, ["io_sharma", "io_verma"])
    bullet("Result:", "DENIED — insufficient approvals" if pt is None else "UNSEALED (unexpected!)")
    bullet("Have / Need:", f"{status['have']} / {status['need']}")

    print("\n  Attempt 2: 3 of 5 custodians approve — should SUCCEED")
    pt2, _, status2 = CustodyService.attempt_unseal(
        session, io_verma, sealed_doc.id, ["io_sharma", "prosecutor_rao", "judge_mehta"]
    )
    bullet("Result:", "UNSEALED ✅" if pt2 else "DENIED (unexpected!)")
    if pt2:
        bullet("Recovered plaintext:", pt2.decode())

    hr("STEP 9 — Generate a hash certificate (BSA 2023 §63(4)-style)")
    prosecutor = AuthService.authenticate(session, "prosecutor_rao", "password123")
    cert_path = CertificateService.generate(session, prosecutor, doc.id)
    bullet("Certificate written to:", cert_path)
    bullet("File size:", f"{os.path.getsize(cert_path)} bytes")

    hr("STEP 10 — Access control sanity check")
    forensic = AuthService.authenticate(session, "forensic_iyer", "password123")
    try:
        DocumentService.retrieve_document(session, forensic, doc.id)
        print("  FAIL: forensic_iyer should NOT have access to a case-1 document (assigned only to case 2)")
    except ac.AccessDenied as e:
        print(f"  Correctly DENIED: {e}")

    hr("DEMO COMPLETE")
    session.close()


if __name__ == "__main__":
    main()

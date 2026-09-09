"""
test_integration.py
====================
End-to-end tests through the service layer against a real (temporary)
SQLite database — the same code path the CLI demo, API, and dashboard all
use. Requires the `fresh_db` fixture (see conftest.py) for isolation.
"""
from core.services import (
    AuthService, DocumentService, AuditService, CustodyService, VerificationService,
)
from core.models import CaseFile
from core import access_control as ac


def _make_case(session, number="FIR-TEST-0001"):
    case = CaseFile(case_number=number, title="Test Case")
    session.add(case)
    session.commit()
    return case


def test_upload_and_retrieve_round_trip(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])

    doc = DocumentService.upload_document(
        session, officer, case.id, "Test FIR", "FIR", b"plaintext body", authorized_usernames=["officer1"],
    )
    plaintext, doc2 = DocumentService.retrieve_document(session, officer, doc.id)
    assert plaintext == b"plaintext body"
    assert doc2.id == doc.id


def test_unauthorized_user_cannot_decrypt_even_with_role_and_case_access(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])
    other_officer = AuthService.create_user(session, "officer2", "Officer Two", "pw", "InvestigatingOfficer", "Cyber", "IO-2", [case.id])

    # officer1 uploads but does NOT list officer2 as authorized
    doc = DocumentService.upload_document(
        session, officer, case.id, "Restricted Doc", "FIR", b"secret", authorized_usernames=["officer1"],
    )
    # officer2 has the right role AND is assigned to the case, but was never wrapped a key
    try:
        DocumentService.retrieve_document(session, other_officer, doc.id)
        assert False, "should have been denied — no wrapped key for officer2"
    except ac.AccessDenied:
        pass


def test_user_not_assigned_to_case_is_denied(fresh_db):
    session = fresh_db
    case1 = _make_case(session, "FIR-CASE-1")
    case2 = _make_case(session, "FIR-CASE-2")
    officer1 = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case1.id])
    officer2 = AuthService.create_user(session, "officer2", "Officer Two", "pw", "InvestigatingOfficer", "Cyber", "IO-2", [case2.id])

    doc = DocumentService.upload_document(
        session, officer1, case1.id, "Case 1 doc", "FIR", b"content", authorized_usernames=["officer1", "officer2"],
    )
    # officer2 IS in the wrapped-key list (has crypto access) but ISN'T assigned to case1
    try:
        DocumentService.retrieve_document(session, officer2, doc.id)
        assert False, "should have been denied — wrong case assignment"
    except ac.AccessDenied:
        pass


def test_judge_has_cross_case_access(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])
    judge = AuthService.create_user(session, "judge1", "Judge One", "pw", "Judge", "Court", "JD-1", [])  # no case assignments

    doc = DocumentService.upload_document(
        session, officer, case.id, "Doc", "FIR", b"content", authorized_usernames=["officer1", "judge1"],
    )
    plaintext, _ = DocumentService.retrieve_document(session, judge, doc.id)
    assert plaintext == b"content"


def test_tamper_detection_end_to_end(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])
    admin = AuthService.create_user(session, "admin1", "Admin", "pw", "Admin", "IT", "AD-1", [])

    doc = DocumentService.upload_document(
        session, officer, case.id, "Doc", "FIR", b"important evidence", authorized_usernames=["officer1"],
    )
    VerificationService.anchor_pending(session, admin)

    result_before = VerificationService.verify_document_integrity(session, doc.id)
    assert result_before["overall_valid"] is True

    VerificationService.tamper_demo(session, doc.id)
    result_after = VerificationService.verify_document_integrity(session, doc.id)
    assert result_after["overall_valid"] is False
    assert result_after["blob_intact"] is False

    VerificationService.restore_demo(session, doc.id)
    result_restored = VerificationService.verify_document_integrity(session, doc.id)
    assert result_restored["overall_valid"] is True


def test_sealed_document_requires_threshold_custodians(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])
    custodians = []
    for i in range(5):
        u = AuthService.create_user(session, f"cust{i}", f"Custodian {i}", "pw", "Judge", "Court", f"C-{i}", [])
        custodians.append(u.username)

    doc = DocumentService.upload_document(
        session, officer, case.id, "Sealed Doc", "Evidence", b"top secret evidence",
        authorized_usernames=[], sealed=True, custody_k=3, custodian_usernames=custodians,
    )
    assert doc.is_sealed

    # 2 of 5 -> denied
    plaintext, _, status = CustodyService.attempt_unseal(session, officer, doc.id, custodians[:2])
    assert plaintext is None
    assert status["have"] == 2 and status["need"] == 3

    # 3 of 5 -> succeeds
    plaintext2, _, status2 = CustodyService.attempt_unseal(session, officer, doc.id, custodians[:3])
    assert plaintext2 == b"top secret evidence"


def test_sealed_document_cannot_be_retrieved_via_normal_path(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])
    custodians = [AuthService.create_user(session, f"cust{i}", f"C{i}", "pw", "Judge", "Court", f"C-{i}", []).username for i in range(3)]

    doc = DocumentService.upload_document(
        session, officer, case.id, "Sealed", "Evidence", b"secret",
        authorized_usernames=[], sealed=True, custody_k=2, custodian_usernames=custodians,
    )
    try:
        DocumentService.retrieve_document(session, officer, doc.id)
        assert False, "sealed documents must not be retrievable through the normal path"
    except ac.AccessDenied:
        pass


def test_audit_chain_stays_valid_across_many_actions(fresh_db):
    session = fresh_db
    case = _make_case(session)
    officer = AuthService.create_user(session, "officer1", "Officer One", "pw", "InvestigatingOfficer", "Cyber", "IO-1", [case.id])

    for i in range(5):
        DocumentService.upload_document(
            session, officer, case.id, f"Doc {i}", "FIR", f"content {i}".encode(), authorized_usernames=["officer1"],
        )
    result = AuditService.verify_full_chain(session)
    assert result.valid


def test_role_without_permission_is_denied(fresh_db):
    session = fresh_db
    case = _make_case(session)
    judge = AuthService.create_user(session, "judge1", "Judge One", "pw", "Judge", "Court", "JD-1", [])
    try:
        DocumentService.upload_document(session, judge, case.id, "Doc", "FIR", b"x", authorized_usernames=[])
        assert False, "Judge role should not be permitted to upload"
    except ac.AccessDenied:
        pass

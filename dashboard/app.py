"""
dashboard/app.py
=================
The interactive demo surface: a Streamlit dashboard that talks directly to
the core service layer (same code path as the CLI demo and the FastAPI
routes — no HTTP hop needed since Streamlit is itself a Python process).

Run:
    streamlit run dashboard/app.py

Login as any seeded user (see seed.py) — e.g. io_sharma / password123.
"""
from __future__ import annotations

import base64
import os
import sys
import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st

from core.db import init_db, get_session
from core.models import CaseFile, User
from core.services import (
    AuthService, DocumentService, AuditService, CustodyService,
    VerificationService, CertificateService, bootstrap,
)
from core import access_control as ac

st.set_page_config(page_title="SentinelVault", page_icon="🔐", layout="wide")


@st.cache_resource
def _bootstrap():
    init_db()
    s = get_session()
    bootstrap(s)
    s.close()


_bootstrap()


def get_db_session():
    """A fresh session per interaction (Streamlit reruns the script on every widget event)."""
    return get_session()


# --------------------------------------------------------------------------
# Auth
# --------------------------------------------------------------------------

if "user" not in st.session_state:
    st.session_state.user = None

if st.session_state.user is None:
    st.markdown("## 🔐 SentinelVault")
    st.caption("Secure Digital Document Management System for Legal & Investigation Records")
    st.markdown("---")
    col1, col2 = st.columns([1, 2])
    with col1:
        st.markdown("#### Sign in")
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        if st.button("Login", type="primary"):
            session = get_db_session()
            user = AuthService.authenticate(session, username, password)
            if user:
                st.session_state.user = {
                    "username": user.username, "full_name": user.full_name,
                    "role": user.role, "department": user.department,
                }
                session.close()
                st.rerun()
            else:
                st.error("Invalid username or password.")
                session.close()
    with col2:
        st.markdown("#### Demo accounts (password: `password123`)")
        st.table([
            {"username": "io_sharma", "role": "InvestigatingOfficer", "cases": "FIR-2024-1123"},
            {"username": "io_verma", "role": "InvestigatingOfficer", "cases": "FIR-2024-1123, FIR-2024-1198"},
            {"username": "prosecutor_rao", "role": "Prosecutor", "cases": "FIR-2024-1123"},
            {"username": "judge_mehta", "role": "Judge", "cases": "all (cross-case authority)"},
            {"username": "clerk_das", "role": "Clerk", "cases": "FIR-2024-1123, FIR-2024-1198"},
            {"username": "forensic_iyer", "role": "ForensicAnalyst", "cases": "FIR-2024-1198"},
            {"username": "admin", "role": "Admin", "cases": "all (cross-case authority)"},
        ])
        st.info("Run `python seed.py` first if these accounts don't work yet.")
    st.stop()


# --------------------------------------------------------------------------
# Logged in — main app
# --------------------------------------------------------------------------

user_info = st.session_state.user

with st.sidebar:
    st.markdown(f"### 👤 {user_info['full_name']}")
    st.caption(f"{user_info['role']} · {user_info['department']}")
    st.markdown("---")
    if st.button("Log out"):
        st.session_state.user = None
        st.rerun()
    st.markdown("---")
    st.caption("SentinelVault prototype — SIH PS 26190")


def current_user_row(session):
    return session.query(User).filter_by(username=user_info["username"]).first()


tabs = st.tabs(["📂 Documents", "🕵️ Audit Trail", "🔒 Sealed Custody", "✅ Verify & Tamper Demo", "📜 Certificate"])

# ==========================================================================
# TAB 1 — Documents
# ==========================================================================
with tabs[0]:
    session = get_db_session()
    me = current_user_row(session)

    col_list, col_upload = st.columns([1.3, 1])

    with col_list:
        st.markdown("#### Your accessible documents")
        query = st.text_input("🔎 Search (title / case number / doc type / tags)", key="search_box")
        if query:
            docs = DocumentService.search_documents(session, me, query)
        else:
            docs = DocumentService.list_documents(session, me)

        if not docs:
            st.info("No documents found (or none match your search).")
        for doc in docs:
            case = session.query(CaseFile).filter_by(id=doc.case_id).first()
            with st.container(border=True):
                c1, c2 = st.columns([3, 1])
                with c1:
                    seal_tag = " 🔒 SEALED" if doc.is_sealed else ""
                    anchor_tag = " ⚓ anchored" if doc.anchored else " ⏳ pending anchor"
                    st.markdown(f"**{doc.title}**{seal_tag}")
                    st.caption(f"{case.case_number} · {doc.doc_type} · uploaded by {doc.uploader_username}{anchor_tag}")
                with c2:
                    if not doc.is_sealed:
                        if st.button("View", key=f"view_{doc.id}"):
                            try:
                                plaintext, _ = DocumentService.retrieve_document(session, me, doc.id)
                                st.session_state[f"content_{doc.id}"] = plaintext.decode(errors="replace")
                            except ac.AccessDenied as e:
                                st.error(str(e))
                    else:
                        st.caption("use Sealed Custody tab")
                if st.session_state.get(f"content_{doc.id}"):
                    st.text_area("Decrypted content", st.session_state[f"content_{doc.id}"], height=100, key=f"ta_{doc.id}")

    with col_upload:
        st.markdown("#### Upload a new document")
        try:
            ac.check_permission(me, "upload")
            cases = session.query(CaseFile).all()
            case_map = {f"{c.case_number} — {c.title}": c.id for c in cases}
            case_label = st.selectbox("Case", list(case_map.keys()))
            title = st.text_input("Document title")
            doc_type = st.selectbox("Document type", ["FIR", "ChargeSheet", "WitnessStatement", "ForensicReport", "CourtFiling", "Evidence", "LegalNotice"])
            tags = st.text_input("Tags (space-separated, for search)")
            content_text = st.text_area("Document content (plain text — this gets AES-256-GCM encrypted)", height=120)

            all_users = session.query(User).all()
            usernames = [u.username for u in all_users]

            sealed = st.checkbox("🔒 Seal this document (threshold custody instead of normal access list)")
            if sealed:
                custodians = st.multiselect("Custodians (choose ≥ k)", usernames)
                k = st.number_input("Threshold k", min_value=2, max_value=max(2, len(custodians) or 2), value=min(3, max(2, len(custodians) or 2)))
            else:
                authorized = st.multiselect("Authorized users (get a wrapped key — required to decrypt)", usernames, default=[me.username])

            if st.button("🔐 Encrypt & Upload", type="primary"):
                try:
                    if sealed:
                        doc = DocumentService.upload_document(
                            session, me, case_map[case_label], title, doc_type, content_text.encode(),
                            authorized_usernames=[], tags=tags, sealed=True, custody_k=int(k),
                            custodian_usernames=custodians,
                        )
                    else:
                        doc = DocumentService.upload_document(
                            session, me, case_map[case_label], title, doc_type, content_text.encode(),
                            authorized_usernames=authorized, tags=tags,
                        )
                    st.success(f"Uploaded '{doc.title}' — document id {doc.id}, ciphertext SHA-256 `{doc.ciphertext_sha256[:24]}...`")
                    st.rerun()
                except Exception as e:
                    st.error(f"Upload failed: {e}")
        except ac.AccessDenied as e:
            st.warning(f"Your role ({me.role}) cannot upload documents.")
    session.close()

# ==========================================================================
# TAB 2 — Audit Trail
# ==========================================================================
with tabs[1]:
    session = get_db_session()
    st.markdown("#### Hash-chained, signed audit log")
    st.caption("Every action is chained to the one before it (`entry_hash` feeds the next entry's `prev_hash`) and individually signed by the actor's ECDSA key.")

    chain = AuditService.get_chain(session)
    result = AuditService.verify_full_chain(session)

    c1, c2 = st.columns([1, 3])
    with c1:
        if result.valid:
            st.success("Chain integrity: VALID ✅")
        else:
            st.error(f"Chain integrity: BROKEN ❌ at seq {result.broken_at_seq} — {result.reason}")
    with c2:
        st.caption(f"{len(chain)} entries total")

    rows = [
        {
            "seq": e.seq, "time": datetime.datetime.fromtimestamp(e.timestamp).strftime("%H:%M:%S"),
            "actor": e.actor_username, "action": e.action, "doc_id": e.document_id,
            "details": e.details, "entry_hash": e.entry_hash[:16] + "...",
            "anchored": "⚓" if e.anchored else "⏳",
        }
        for e in reversed(chain)
    ]
    st.dataframe(rows, use_container_width=True, height=400)
    session.close()

# ==========================================================================
# TAB 3 — Sealed Custody
# ==========================================================================
with tabs[2]:
    session = get_db_session()
    me = current_user_row(session)
    st.markdown("#### Threshold (Shamir's Secret Sharing) unsealing")
    st.caption("Sealed documents cannot be decrypted by any single person — k of n designated custodians must jointly approve.")

    sealed_docs = [d for d in DocumentService.list_documents(session, me) if d.is_sealed]
    if not sealed_docs:
        st.info("No sealed documents visible to you yet. Upload one from the Documents tab with 'Seal this document' checked.")
    else:
        doc_map = {f"{d.title} (doc {d.id}) — {d.custody_k}-of-{d.custody_n}": d.id for d in sealed_docs}
        chosen_label = st.selectbox("Sealed document", list(doc_map.keys()))
        doc_id = doc_map[chosen_label]

        shares = CustodyService.custodians_for(session, doc_id)
        custodian_names = [s.custodian_username for s in shares]
        st.caption(f"Registered custodians: {', '.join(custodian_names)}")

        approving = st.multiselect("Simulate custodian approvals (select who 'approves' this unseal)", custodian_names)

        if st.button("🔓 Attempt Unseal", type="primary"):
            try:
                plaintext, doc, status = CustodyService.attempt_unseal(session, me, doc_id, approving)
                if plaintext is None:
                    st.warning(f"DENIED — only {status['have']} of {status['need']} required approvals given.")
                else:
                    st.success(f"UNSEALED ✅ — {status['have']} of {status['need']} custodians approved.")
                    st.text_area("Decrypted sealed content", plaintext.decode(errors="replace"), height=100)
            except ac.AccessDenied as e:
                st.error(str(e))
    session.close()

# ==========================================================================
# TAB 4 — Verify & Tamper Demo
# ==========================================================================
with tabs[3]:
    session = get_db_session()
    me = current_user_row(session)
    st.markdown("#### Integrity verification — the live tamper-detection demo")
    st.caption("Recomputes the stored blob's hash, checks it against the Merkle-proof-anchored block, and walks the whole audit + block chain.")

    docs = DocumentService.list_documents(session, me)
    if not docs:
        st.info("No documents yet.")
    else:
        doc_map = {f"{d.title} (doc {d.id})": d.id for d in docs}
        chosen = st.selectbox("Document", list(doc_map.keys()))
        doc_id = doc_map[chosen]

        c1, c2, c3, c4 = st.columns(4)
        with c1:
            if st.button("⚓ Anchor Pending Entries"):
                try:
                    block = VerificationService.anchor_pending(session, me)
                    if block:
                        st.success(f"Anchored into block {block.block_index}")
                    else:
                        st.info("Nothing pending to anchor.")
                except ac.AccessDenied as e:
                    st.error(str(e))
        with c2:
            if st.button("🔨 Tamper (corrupt stored blob)"):
                VerificationService.tamper_demo(session, doc_id)
                st.warning("Blob corrupted on disk — bypassing the application entirely.")
        with c3:
            if st.button("♻️ Restore Original"):
                VerificationService.restore_demo(session, doc_id)
                st.info("Blob restored from backup.")
        with c4:
            verify_clicked = st.button("✅ Verify Integrity", type="primary")

        if verify_clicked:
            result = VerificationService.verify_document_integrity(session, doc_id)
            if result["overall_valid"]:
                st.success("VALID ✅ — document integrity confirmed")
            else:
                st.error("INVALID ❌ — TAMPERING DETECTED")
            st.json(result)
    session.close()

# ==========================================================================
# TAB 5 — Certificate
# ==========================================================================
with tabs[4]:
    session = get_db_session()
    me = current_user_row(session)
    st.markdown("#### Hash Certificate (BSA 2023 §63(4)-style)")
    st.caption("Generates a PDF certificate for courtroom-style evidentiary use, built from the document's real hash, signature, and anchoring status.")

    docs = DocumentService.list_documents(session, me)
    if not docs:
        st.info("No documents yet.")
    else:
        doc_map = {f"{d.title} (doc {d.id})": d.id for d in docs}
        chosen = st.selectbox("Document", list(doc_map.keys()), key="cert_doc_select")
        doc_id = doc_map[chosen]
        if st.button("📜 Generate Certificate", type="primary"):
            try:
                path = CertificateService.generate(session, me, doc_id)
                with open(path, "rb") as f:
                    pdf_bytes = f.read()
                st.success("Certificate generated.")
                st.download_button("⬇️ Download Certificate PDF", pdf_bytes, file_name=os.path.basename(path), mime="application/pdf")
            except ac.AccessDenied as e:
                st.error(str(e))
    session.close()

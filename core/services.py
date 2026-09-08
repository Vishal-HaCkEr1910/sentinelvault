"""
services.py
===========
The orchestration layer. Every other core/ module is a pure primitive that
knows nothing about the database; everything here wires those primitives
together with SQLAlchemy sessions to implement the actual application
behaviour described in the pitch deck. This is the file to read to
understand "what does the system actually do", end to end.

Layout:
    AuthService          - login, JWT issuance/verification
    DocumentService       - upload / retrieve / list / search
    AuditService           - append + read the hash-chained log
    CustodyService           - threshold (Shamir) unsealing of sealed docs
    VerificationService        - anchoring + integrity verification + tamper demo
    CertificateService           - BSA S.63(4)-style hash certificate PDFs
"""
from __future__ import annotations

import time
import bcrypt
import jwt as pyjwt

from sqlalchemy.orm import Session

from core import crypto_utils as cu
from core import pki
from core import hashchain
from core import blockchain as bc
from core import merkle
from core import secret_sharing as sss
from core import searchable_index as sidx
from core import storage
from core import access_control as ac
from core import certificate as certmod
from core.models import (
    User, CaseFile, Document, WrappedKey, CustodyShare,
    AuditEntryRow, BlockRow, SearchIndexRow, NetworkKey, SearchKeyRow,
)

JWT_SECRET = "sentinelvault-dev-secret-change-in-production"  # noqa: S105 — demo only, see README
JWT_ALGO = "HS256"
JWT_EXPIRY_SECONDS = 8 * 3600


# ==========================================================================
# Bootstrap helpers (network key, genesis block, search key)
# ==========================================================================

def _get_or_create_network_key(session: Session) -> NetworkKey:
    row = session.query(NetworkKey).first()
    if row:
        return row
    kp = cu.new_ec_keypair()
    row = NetworkKey(private_pem=kp.private_pem, public_pem=kp.public_pem)
    session.add(row)
    session.commit()
    genesis = bc.create_genesis_block(row.private_pem)
    block_row = BlockRow(
        block_index=genesis.index, timestamp=genesis.timestamp, merkle_root=genesis.merkle_root,
        prev_block_hash=genesis.prev_block_hash, block_hash=genesis.block_hash,
        signature_hex=genesis.signature_hex, leaf_hashes_json="[]", entry_ids_json="[]",
    )
    session.add(block_row)
    session.commit()
    return row


def _get_or_create_search_key(session: Session) -> bytes:
    row = session.query(SearchKeyRow).first()
    if row:
        return bytes.fromhex(row.key_hex)
    import os as _os
    key = _os.urandom(32)
    session.add(SearchKeyRow(key_hex=key.hex()))
    session.commit()
    return key


def _block_row_to_block(row: BlockRow) -> bc.Block:
    import json
    return bc.Block(
        index=row.block_index, timestamp=row.timestamp, merkle_root=row.merkle_root,
        prev_block_hash=row.prev_block_hash, leaf_hashes=json.loads(row.leaf_hashes_json),
        entry_ids=json.loads(row.entry_ids_json), block_hash=row.block_hash,
        signature_hex=row.signature_hex,
    )


def _audit_row_to_entry(row: AuditEntryRow) -> hashchain.AuditEntry:
    return hashchain.AuditEntry(
        seq=row.seq, actor_username=row.actor_username, action=row.action,
        document_id=row.document_id, details=row.details, timestamp=row.timestamp,
        prev_hash=row.prev_hash, entry_hash=row.entry_hash, signature_hex=row.signature_hex,
    )


def bootstrap(session: Session):
    """Call once at app start — ensures network key + genesis block + search key exist."""
    _get_or_create_network_key(session)
    _get_or_create_search_key(session)


# ==========================================================================
# AuthService
# ==========================================================================

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    @staticmethod
    def verify_password(password: str, password_hash: str) -> bool:
        return bcrypt.checkpw(password.encode(), password_hash.encode())

    @staticmethod
    def create_user(
        session: Session, username: str, full_name: str, password: str,
        role: str, department: str, employee_id: str, assigned_case_ids: list[int] | None = None,
    ) -> User:
        identity = pki.issue_certificate(common_name=username, role=role, department=department, employee_id=employee_id)
        enc_kp = cu.new_rsa_keypair()
        user = User(
            username=username, full_name=full_name,
            password_hash=AuthService.hash_password(password),
            role=role, department=department, employee_id=employee_id,
            assigned_case_ids=",".join(str(c) for c in (assigned_case_ids or [])),
            cert_pem=identity.certificate_pem,
            ec_private_pem=identity.signing_keypair.private_pem,
            ec_public_pem=identity.signing_keypair.public_pem,
            rsa_private_pem=enc_kp.private_pem,
            rsa_public_pem=enc_kp.public_pem,
        )
        session.add(user)
        session.commit()
        return user

    @staticmethod
    def authenticate(session: Session, username: str, password: str) -> User | None:
        user = session.query(User).filter_by(username=username).first()
        if not user or not AuthService.verify_password(password, user.password_hash):
            return None
        return user

    @staticmethod
    def issue_token(user: User) -> str:
        payload = {"sub": user.username, "role": user.role, "exp": time.time() + JWT_EXPIRY_SECONDS}
        return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

    @staticmethod
    def current_user_from_token(session: Session, token: str) -> User:
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        except pyjwt.PyJWTError as e:
            raise ac.AccessDenied(f"invalid or expired token: {e}")
        user = session.query(User).filter_by(username=payload["sub"]).first()
        if not user:
            raise ac.AccessDenied("token refers to a user that no longer exists")
        return user


# ==========================================================================
# AuditService
# ==========================================================================

class AuditService:
    @staticmethod
    def append(session: Session, actor: User, action: str, document_id: int | None, details: str) -> AuditEntryRow:
        last = session.query(AuditEntryRow).order_by(AuditEntryRow.seq.desc()).first()
        seq = (last.seq + 1) if last else 0
        prev_hash = last.entry_hash if last else hashchain.GENESIS_HASH
        entry = hashchain.create_entry(
            seq=seq, prev_hash=prev_hash, actor_username=actor.username, action=action,
            document_id=document_id, details=details, signer_private_key_pem=actor.ec_private_pem,
        )
        row = AuditEntryRow(
            seq=entry.seq, actor_username=entry.actor_username, action=entry.action,
            document_id=entry.document_id, details=entry.details, timestamp=entry.timestamp,
            prev_hash=entry.prev_hash, entry_hash=entry.entry_hash, signature_hex=entry.signature_hex,
        )
        session.add(row)
        session.commit()
        return row

    @staticmethod
    def get_chain(session: Session, document_id: int | None = None) -> list[AuditEntryRow]:
        q = session.query(AuditEntryRow).order_by(AuditEntryRow.seq.asc())
        if document_id is not None:
            q = q.filter_by(document_id=document_id)
        return q.all()

    @staticmethod
    def verify_full_chain(session: Session) -> hashchain.ChainVerificationResult:
        rows = session.query(AuditEntryRow).order_by(AuditEntryRow.seq.asc()).all()
        entries = [_audit_row_to_entry(r) for r in rows]
        users = {u.username: u.ec_public_pem for u in session.query(User).all()}
        return hashchain.verify_chain(entries, users)


# ==========================================================================
# DocumentService
# ==========================================================================

class DocumentService:
    @staticmethod
    def upload_document(
        session: Session, current_user: User, case_id: int, title: str, doc_type: str,
        plaintext: bytes, authorized_usernames: list[str], tags: str = "",
        sealed: bool = False, custody_k: int | None = None, custodian_usernames: list[str] | None = None,
    ) -> Document:
        ac.check_permission(current_user, "upload")
        case = session.query(CaseFile).filter_by(id=case_id).first()
        if not case:
            raise ValueError(f"no such case_id {case_id}")

        dek = cu.generate_dek()
        aad = f"{case_id}:{title}".encode()
        nonce, ciphertext = cu.aes_encrypt(dek, plaintext, aad)
        blob_path = storage.save_blob(ciphertext)
        ciphertext_hash = cu.sha256_hex(ciphertext)

        doc = Document(
            case_id=case_id, title=title, doc_type=doc_type, uploader_username=current_user.username,
            blob_path=blob_path, nonce_hex=nonce.hex(), ciphertext_sha256=ciphertext_hash,
            is_sealed=sealed, custody_k=custody_k, custody_n=(len(custodian_usernames) if custodian_usernames else None),
        )
        session.add(doc)
        session.commit()  # assigns doc.id

        if sealed:
            if not custody_k or not custodian_usernames or len(custodian_usernames) < custody_k:
                raise ValueError("sealed documents require custody_k and at least custody_k custodian usernames")
            shares = sss.split_secret(dek, custody_k, len(custodian_usernames))
            for username, share in zip(custodian_usernames, shares):
                custodian = session.query(User).filter_by(username=username).first()
                if not custodian:
                    raise ValueError(f"no such custodian '{username}'")
                custodian_pub = cu.load_public_key_from_pem(custodian.rsa_public_pem)
                encrypted_share = cu.rsa_wrap_key(custodian_pub, share.y)
                session.add(CustodyShare(
                    document_id=doc.id, custodian_username=username,
                    share_x=share.x, encrypted_share_hex=encrypted_share.hex(),
                ))
        else:
            for username in authorized_usernames:
                user = session.query(User).filter_by(username=username).first()
                if not user:
                    raise ValueError(f"no such authorized user '{username}'")
                wrapped = cu.rsa_wrap_key(cu.load_public_key_from_pem(user.rsa_public_pem), dek)
                session.add(WrappedKey(document_id=doc.id, username=username, wrapped_dek_hex=wrapped.hex()))

        search_key = _get_or_create_search_key(session)
        trapdoors = sidx.build_trapdoors_for_text(search_key, title, doc_type, tags, case.case_number)
        for t in trapdoors:
            session.add(SearchIndexRow(trapdoor_hex=t, document_id=doc.id))

        session.commit()

        audit_row = AuditService.append(
            session, current_user, "UPLOAD", doc.id,
            f"Uploaded '{title}' ({doc_type}) to case {case.case_number}"
            + (f" [SEALED, {custody_k}-of-{len(custodian_usernames)} custody]" if sealed else ""),
        )
        doc.audit_entry_seq_for_upload = audit_row.seq
        session.commit()
        return doc

    @staticmethod
    def retrieve_document(session: Session, current_user: User, document_id: int) -> tuple[bytes, Document]:
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            raise ValueError(f"no such document {document_id}")
        ac.check_document_access(current_user, doc, "view")
        if doc.is_sealed:
            raise ac.AccessDenied("this document is SEALED — use CustodyService.attempt_unseal with k-of-n custodian approval instead")

        wrapped = session.query(WrappedKey).filter_by(document_id=document_id, username=current_user.username).first()
        if not wrapped:
            raise ac.AccessDenied(
                f"'{current_user.username}' has role/case access but was never granted a decryption key "
                f"for this document at upload time — the ciphertext itself enforces this, not just app policy"
            )

        dek = cu.rsa_unwrap_key(cu.load_private_key_from_pem(current_user.rsa_private_pem), bytes.fromhex(wrapped.wrapped_dek_hex))
        case = session.query(CaseFile).filter_by(id=doc.case_id).first()
        aad = f"{doc.case_id}:{doc.title}".encode()
        ciphertext = storage.load_blob(doc.blob_path)
        plaintext = cu.aes_decrypt(dek, bytes.fromhex(doc.nonce_hex), ciphertext, aad)

        AuditService.append(session, current_user, "VIEW", doc.id, f"Viewed '{doc.title}' (case {case.case_number})")
        return plaintext, doc

    @staticmethod
    def list_documents(session: Session, current_user: User) -> list[Document]:
        docs = session.query(Document).all()
        if current_user.role in ac.CROSS_CASE_ROLES:
            return docs
        assigned = set(current_user.assigned_cases())
        return [d for d in docs if d.case_id in assigned]

    @staticmethod
    def search_documents(session: Session, current_user: User, query: str) -> list[Document]:
        search_key = _get_or_create_search_key(session)
        trapdoors = sidx.query_trapdoor(search_key, query)
        if not trapdoors:
            return []
        matched_ids = {
            row.document_id for row in session.query(SearchIndexRow).filter(SearchIndexRow.trapdoor_hex.in_(trapdoors)).all()
        }
        accessible = DocumentService.list_documents(session, current_user)
        return [d for d in accessible if d.id in matched_ids]


# ==========================================================================
# CustodyService
# ==========================================================================

class CustodyService:
    @staticmethod
    def custodians_for(session: Session, document_id: int) -> list[CustodyShare]:
        return session.query(CustodyShare).filter_by(document_id=document_id).all()

    @staticmethod
    def attempt_unseal(
        session: Session, current_user: User, document_id: int, approving_custodian_usernames: list[str],
    ) -> tuple[bytes | None, Document, dict]:
        """
        Returns (plaintext_or_None, document, status_dict). plaintext is None
        if fewer than k custodians approved — the caller should show status
        (have/need) without treating that as an exception, since "not enough
        approvals yet" is an expected, normal state during a live demo.
        """
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc or not doc.is_sealed:
            raise ValueError("document is not sealed (or does not exist)")
        ac.check_document_access(current_user, doc, "custody_participate")

        all_shares = {s.custodian_username: s for s in CustodyService.custodians_for(session, document_id)}
        valid_approvers = [u for u in approving_custodian_usernames if u in all_shares]

        status = {"have": len(valid_approvers), "need": doc.custody_k, "approvers": valid_approvers}
        if len(valid_approvers) < doc.custody_k:
            return None, doc, status

        used = valid_approvers[: doc.custody_k]
        shares = []
        for username in used:
            row = all_shares[username]
            custodian = session.query(User).filter_by(username=username).first()
            share_bytes = cu.rsa_unwrap_key(cu.load_private_key_from_pem(custodian.rsa_private_pem), bytes.fromhex(row.encrypted_share_hex))
            shares.append(sss.Share(x=row.share_x, y=share_bytes))

        dek = sss.reconstruct_secret(shares)
        case = session.query(CaseFile).filter_by(id=doc.case_id).first()
        aad = f"{doc.case_id}:{doc.title}".encode()
        ciphertext = storage.load_blob(doc.blob_path)
        plaintext = cu.aes_decrypt(dek, bytes.fromhex(doc.nonce_hex), ciphertext, aad)
        del dek  # reconstructed key never persisted; scoped to this call only

        AuditService.append(
            session, current_user, "UNSEAL", doc.id,
            f"Sealed document '{doc.title}' unsealed via {doc.custody_k}-of-{doc.custody_n} custody "
            f"(approving custodians: {', '.join(used)})",
        )
        return plaintext, doc, status


# ==========================================================================
# VerificationService
# ==========================================================================

class VerificationService:
    @staticmethod
    def anchor_pending(session: Session, actor: User) -> BlockRow | None:
        ac.check_permission(actor, "anchor")
        pending = session.query(AuditEntryRow).filter_by(anchored=False).order_by(AuditEntryRow.seq.asc()).all()
        if not pending:
            return None
        network = _get_or_create_network_key(session)
        prev_row = session.query(BlockRow).order_by(BlockRow.block_index.desc()).first()
        prev_block = _block_row_to_block(prev_row)

        entry_hashes = [r.entry_hash for r in pending]
        entry_ids = [r.id for r in pending]
        new_block = bc.anchor_batch(prev_block, entry_hashes, entry_ids, network.private_pem)

        import json
        block_row = BlockRow(
            block_index=new_block.index, timestamp=new_block.timestamp, merkle_root=new_block.merkle_root,
            prev_block_hash=new_block.prev_block_hash, block_hash=new_block.block_hash,
            signature_hex=new_block.signature_hex, leaf_hashes_json=json.dumps(new_block.leaf_hashes),
            entry_ids_json=json.dumps(new_block.entry_ids),
        )
        session.add(block_row)

        for r in pending:
            r.anchored = True
            r.block_index = new_block.index
            if r.action == "UPLOAD" and r.document_id is not None:
                doc = session.query(Document).filter_by(id=r.document_id).first()
                if doc:
                    doc.anchored = True
                    doc.block_index = new_block.index

        AuditService.append(session, actor, "ANCHOR", None, f"Anchored {len(pending)} pending audit entries into block {new_block.index}")
        session.commit()
        return block_row

    @staticmethod
    def verify_document_integrity(session: Session, document_id: int) -> dict:
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            raise ValueError(f"no such document {document_id}")

        ciphertext = storage.load_blob(doc.blob_path)
        recomputed_hash = cu.sha256_hex(ciphertext)
        blob_intact = (recomputed_hash == doc.ciphertext_sha256)

        result = {
            "document_id": doc.id, "title": doc.title,
            "stored_hash": doc.ciphertext_sha256, "recomputed_hash": recomputed_hash,
            "blob_intact": blob_intact, "anchored": doc.anchored,
            "merkle_proof_valid": None, "chain_valid": None, "block_index": doc.block_index,
            "audit_chain_valid": None,
        }

        audit_chain_result = AuditService.verify_full_chain(session)
        result["audit_chain_valid"] = audit_chain_result.valid
        result["audit_chain_detail"] = audit_chain_result.reason or "OK"

        if doc.anchored and doc.audit_entry_seq_for_upload is not None:
            upload_entry = session.query(AuditEntryRow).filter_by(seq=doc.audit_entry_seq_for_upload).first()
            block_row = session.query(BlockRow).filter_by(block_index=doc.block_index).first()
            block = _block_row_to_block(block_row)
            proof = bc.find_proof_for_entry(block, upload_entry.entry_hash)
            merkle_ok = bool(proof is not None and merkle.MerkleTree.verify_proof(upload_entry.entry_hash, proof, block.merkle_root))
            result["merkle_proof_valid"] = merkle_ok

            network = _get_or_create_network_key(session)
            all_blocks = [_block_row_to_block(b) for b in session.query(BlockRow).order_by(BlockRow.block_index.asc()).all()]
            chain_result = bc.verify_chain(all_blocks, network.public_pem)
            result["chain_valid"] = chain_result.valid
            result["chain_detail"] = chain_result.reason or "OK"

        result["overall_valid"] = bool(
            blob_intact and result["audit_chain_valid"]
            and (result["merkle_proof_valid"] in (True, None))
            and (result["chain_valid"] in (True, None))
        )
        return result

    @staticmethod
    def tamper_demo(session: Session, document_id: int) -> None:
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            raise ValueError(f"no such document {document_id}")
        storage.tamper_blob(doc.blob_path)

    @staticmethod
    def restore_demo(session: Session, document_id: int) -> None:
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            raise ValueError(f"no such document {document_id}")
        storage.restore_blob(doc.blob_path)


# ==========================================================================
# CertificateService
# ==========================================================================

class CertificateService:
    @staticmethod
    def generate(session: Session, current_user: User, document_id: int) -> str:
        ac.check_permission(current_user, "generate_certificate")
        doc = session.query(Document).filter_by(id=document_id).first()
        if not doc:
            raise ValueError(f"no such document {document_id}")
        case = session.query(CaseFile).filter_by(id=doc.case_id).first()
        uploader = session.query(User).filter_by(username=doc.uploader_username).first()
        upload_entry = session.query(AuditEntryRow).filter_by(seq=doc.audit_entry_seq_for_upload).first()

        verify_result = VerificationService.verify_document_integrity(session, document_id)

        cert_data = {
            "document_id": doc.id, "title": doc.title, "case_number": case.case_number,
            "doc_type": doc.doc_type, "uploader": uploader.full_name, "uploader_role": uploader.role,
            "upload_timestamp": doc.created_at, "ciphertext_sha256": doc.ciphertext_sha256,
            "audit_entry_hash": upload_entry.entry_hash, "audit_signature_hex": upload_entry.signature_hex,
            "anchored": doc.anchored, "block_index": doc.block_index,
            "merkle_root": verify_result.get("merkle_proof_valid") is not None and _merkle_root_for(session, doc.block_index) or "",
            "block_hash": _block_hash_for(session, doc.block_index) if doc.anchored else "",
            "merkle_proof_valid": verify_result.get("merkle_proof_valid"),
            "chain_valid": verify_result.get("chain_valid"),
        }
        path = certmod.generate_certificate(cert_data)
        AuditService.append(session, current_user, "CERTIFICATE_EXPORT", doc.id, f"Generated hash certificate for '{doc.title}'")
        return path


def _merkle_root_for(session: Session, block_index: int | None) -> str:
    if block_index is None:
        return ""
    row = session.query(BlockRow).filter_by(block_index=block_index).first()
    return row.merkle_root if row else ""


def _block_hash_for(session: Session, block_index: int | None) -> str:
    if block_index is None:
        return ""
    row = session.query(BlockRow).filter_by(block_index=block_index).first()
    return row.block_hash if row else ""

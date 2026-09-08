"""
certificate.py
===============
Generates a downloadable "Hash Certificate" PDF for a document — the
artifact the Section 63(4) requirement of the Bharatiya Sakshya Adhiniyam,
2023 (India's current electronics-evidence law, effective 1 July 2024,
replacing the old Evidence Act's Section 65B) asks for: a certificate
identifying the electronic record and the hash value that establishes its
integrity, so it can be admitted in court without a live witness.

This is NOT a legal opinion or a certified court filing — it's a
technical artifact demonstrating the *kind* of certificate a real
deployment would produce, generated from real cryptographic material
(the document's actual SHA-256, its actual audit-log entry hash and
signature, and — once anchored — its actual Merkle proof and block hash).
Say that plainly in any pitch: "this is what the law asks for, generated
from what we can actually verify," not "we are lawyers."
"""
from __future__ import annotations

import datetime
import os

from fpdf import FPDF

CERT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "certificates")
os.makedirs(CERT_DIR, exist_ok=True)


def _fmt_time(ts: float) -> str:
    return datetime.datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S UTC")


def generate_certificate(cert_data: dict) -> str:
    """
    `cert_data` keys:
        document_id, title, case_number, doc_type, uploader, uploader_role,
        ciphertext_sha256, upload_timestamp, audit_entry_hash, audit_signature_hex,
        anchored (bool), block_index, merkle_root, block_hash, merkle_proof_valid,
        chain_valid
    Returns the path to the generated PDF.
    """
    pdf = FPDF(format="A4")
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=18)

    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(14, 31, 61)
    pdf.cell(0, 10, "SentinelVault - Electronic Record Hash Certificate", ln=True)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 6, "Generated in the format contemplated by Section 63(4), Bharatiya Sakshya Adhiniyam, 2023", ln=True)
    pdf.ln(4)

    pdf.set_draw_color(200, 200, 200)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(6)

    left_margin = pdf.l_margin
    label_w = 58

    def row(label, value):
        y = pdf.get_y()
        pdf.set_xy(left_margin, y)
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(14, 31, 61)
        pdf.cell(label_w, 7, label, border=0)
        pdf.set_xy(left_margin + label_w, y)
        pdf.set_font("Courier", "", 9.5)
        pdf.set_text_color(30, 30, 30)
        avail_w = pdf.w - pdf.r_margin - (left_margin + label_w)
        pdf.multi_cell(avail_w, 7, str(value))
        pdf.set_x(left_margin)

    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(14, 31, 61)
    pdf.cell(0, 8, "1. Record Identification", ln=True)
    row("Document ID:", cert_data["document_id"])
    row("Title:", cert_data["title"])
    row("Case Number:", cert_data["case_number"])
    row("Document Type:", cert_data["doc_type"])
    row("Uploaded By:", f"{cert_data['uploader']} ({cert_data['uploader_role']})")
    row("Upload Time:", _fmt_time(cert_data["upload_timestamp"]))
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "2. Cryptographic Hash Value", ln=True)
    row("Algorithm:", "SHA-256")
    row("Ciphertext Hash:", cert_data["ciphertext_sha256"])
    row("Audit Log Entry Hash:", cert_data["audit_entry_hash"])
    row("Entry Signature (ECDSA P-256):", cert_data["audit_signature_hex"][:120] + "...")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "3. Blockchain Anchoring Status", ln=True)
    if cert_data["anchored"]:
        row("Anchored:", "YES")
        row("Block Index:", cert_data["block_index"])
        row("Block Merkle Root:", cert_data["merkle_root"])
        row("Block Hash:", cert_data["block_hash"])
        row("Merkle Inclusion Proof Valid:", "YES" if cert_data["merkle_proof_valid"] else "NO - INTEGRITY FAILURE")
        row("Full Chain Valid:", "YES" if cert_data["chain_valid"] else "NO - INTEGRITY FAILURE")
    else:
        row("Anchored:", "NOT YET ANCHORED (pending batch anchor)")
    pdf.ln(3)

    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(0, 8, "4. Certificate Statement", ln=True)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(50, 50, 50)
    overall_ok = cert_data["anchored"] and cert_data["merkle_proof_valid"] and cert_data["chain_valid"]
    statement = (
        f"This certificate attests that the electronic record identified above was hashed at the "
        f"point of upload using SHA-256, that the hash was recorded in a signed, hash-chained audit "
        f"log entry, and that {'the entry has since been anchored in a tamper-evident block ledger and its inclusion proof independently verifies' if cert_data['anchored'] else 'the entry is pending anchoring into the block ledger'}. "
        f"Recomputing the hash of the stored record and comparing it against the value in Section 2 "
        f"is sufficient to detect any alteration made after this certificate was issued."
    )
    pdf.multi_cell(0, 6, statement)
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(14, 31, 61) if overall_ok else pdf.set_text_color(180, 30, 30)
    pdf.cell(0, 8, f"Overall Integrity Status: {'VERIFIED' if overall_ok else 'PENDING / UNVERIFIED'}", ln=True)

    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(130, 130, 130)
    pdf.multi_cell(
        0, 5,
        "This is a technically-generated certificate produced by the SentinelVault prototype for "
        "hackathon demonstration purposes. It illustrates the artifact contemplated by Section 63(4) "
        "of the Bharatiya Sakshya Adhiniyam, 2023, and is not a substitute for legal certification by "
        "an authorized officer under that Act. Generated at " + _fmt_time(datetime.datetime.now().timestamp()) + "."
    )

    path = os.path.join(CERT_DIR, f"certificate_doc{cert_data['document_id']}_{int(datetime.datetime.now().timestamp())}.pdf")
    pdf.output(path)
    return path

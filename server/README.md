# 🔐 SentinelVault

**A Secure Digital Document Management System for Legal & Investigation Records**
Built for SIH-style problem statement 26190 — implemented almost entirely in Python.

> This is a working hackathon prototype, not a production system. Every
> deliberate simplification is called out explicitly in [Known
> Limitations](#known-limitations) below — read that section before a demo
> so you can answer "wait, is this actually secure?" honestly and
> confidently.

---

## What this actually does

Every primitive in the pitch deck is real, working code here — not
diagrams:

| Property | How it's implemented |
|---|---|
| **Confidentiality** | AES-256-GCM envelope encryption; each document gets a fresh random key, wrapped with RSA-OAEP separately for every authorized user |
| **Fine-grained access** | RBAC + case-scoping (`core/access_control.py`) **plus** ciphertext-level enforcement — a user with no wrapped key literally cannot decrypt, regardless of app-layer bugs |
| **Tamper-evidence** | Every action is hash-chained and ECDSA-signed (`core/hashchain.py`); batches of entries are Merkle-rooted and anchored into a signed block ledger (`core/blockchain.py`) |
| **Chain of custody** | Sealed documents split their key via Shamir's Secret Sharing (`core/secret_sharing.py`, implemented from scratch over GF(2⁸) — no library does this) — no single person can unlock them |
| **Identity** | An internal X.509 CA (`core/pki.py`) issues real certificates binding each officer's signing key to their role/department |
| **Search** | Metadata search + an HMAC-based searchable-encryption keyword index (`core/searchable_index.py`) — keywords are never stored in plaintext |
| **Court admissibility** | Auto-generated hash-certificate PDF modeled on Section 63(4), Bharatiya Sakshya Adhiniyam 2023 (`core/certificate.py`) |

Every one of these has a passing automated test in `tests/` — including
tests that deliberately try to break them (forged signatures, sub-threshold
Shamir reconstruction, tampered blobs, wrong-case access attempts).

---

## Project layout

```
sentinelvault/
├── core/                    # ALL the actual logic — pure Python, no framework dependency
│   ├── crypto_utils.py       # AES-256-GCM, RSA-OAEP, ECDSA, SHA-256 (all via `cryptography`)
│   ├── pki.py                  # Internal CA — issues X.509 certs binding identity to role
│   ├── merkle.py                 # Merkle tree + inclusion proofs
│   ├── secret_sharing.py           # Shamir's Secret Sharing over GF(2^8), from scratch
│   ├── hashchain.py                  # Hash-chained, signed audit log
│   ├── blockchain.py                   # Merkle-root anchoring into a signed block ledger
│   ├── searchable_index.py               # HMAC-trapdoor encrypted keyword search
│   ├── access_control.py                   # RBAC + case-scoping policy engine
│   ├── storage.py                             # Encrypted blob storage (filesystem stand-in for MinIO/S3)
│   ├── models.py                                # SQLAlchemy ORM models
│   ├── db.py                                      # PostgreSQL engine/session
│   ├── certificate.py                               # BSA §63(4)-style hash certificate PDF
│   └── services.py                                    # Orchestration layer — READ THIS FIRST
├── api/
│   ├── main.py                # FastAPI REST layer over core/services.py
│   └── schemas.py              # Pydantic request/response models
├── dashboard/
│   └── app.py                    # Streamlit interactive demo UI
├── tests/
│   ├── test_crypto_primitives.py    # Unit tests: crypto, Merkle, Shamir, hash-chain, blockchain
│   └── test_integration.py            # End-to-end service-layer tests
├── seed.py                      # Creates demo users/cases — RUN THIS FIRST
├── cli_demo.py                    # Scripted terminal walkthrough of the entire system
└── requirements.txt
```

**Start reading at `core/services.py`** — it's the orchestration layer that
ties every primitive together and is the fastest way to understand what the
system actually does end to end.

---

## Setup

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run as a PostgreSQL administrator, once per machine:
psql -h localhost -U postgres -d postgres -f setup_postgres.sql

python seed.py                     # creates tables and demo users/cases (run once)
```

The application connects to PostgreSQL using:

```text
postgresql+psycopg2://luffy:luffy@localhost:5432/SentinelVault
```

Set `DATABASE_URL` to override this value in another environment. The
database stores users, cases, document metadata, wrapped keys, custody
shares, audit entries, blockchain blocks, and search keys. Encrypted file
contents remain in the configured object-storage layer and are referenced by
the document's `blob_path` column.

All demo accounts use the password `password123`:

| Username | Role | Assigned cases |
|---|---|---|
| `io_sharma` | InvestigatingOfficer | FIR-2024-1123 |
| `io_verma` | InvestigatingOfficer | FIR-2024-1123, FIR-2024-1198 |
| `prosecutor_rao` | Prosecutor | FIR-2024-1123 |
| `judge_mehta` | Judge | *(all cases — cross-case authority)* |
| `clerk_das` | Clerk | FIR-2024-1123, FIR-2024-1198 |
| `forensic_iyer` | ForensicAnalyst | FIR-2024-1198 |
| `admin` | Admin | *(all cases)* |

## Running it

**Fastest way to see everything work (no UI needed):**
```bash
python cli_demo.py
```
Walks through upload → audit trail → blockchain anchoring → **live tamper
detection** → threshold custody unsealing → hash certificate generation,
narrated step by step in the terminal.

**Interactive dashboard (recommended for a live demo):**
```bash
streamlit run dashboard/app.py
```
Then open the printed `localhost` URL, log in as any demo user, and use the
five tabs: Documents, Audit Trail, Sealed Custody, Verify & Tamper Demo,
Certificate.

**REST API** (if you want to wire up the React frontend from the pitch deck,
or just poke it with `curl`/Postman):
```bash
uvicorn api.main:app --reload --port 8000
```
Interactive docs at `http://localhost:8000/docs`.

**Run the test suite:**
```bash
pytest tests/ -v
```
21 tests, covering both the pure crypto primitives and full service-layer
integration flows.

---

## The demo script (mirrors the pitch deck)

1. **Login as `io_sharma`, upload a normal FIR document.** Watch it get
   AES-256-GCM encrypted and its key wrapped per authorized user.
2. **Login as `io_verma`, upload a SEALED document** with 3-of-5 custody.
3. **Open the Audit Trail tab** — every action hash-chained and signed;
   hit "Verify Chain Integrity."
4. **Hit "Anchor Pending Entries"** in the Verify tab — batches the audit
   log into a Merkle root and writes a new signed block.
5. **Hit "Verify Integrity"** — passes.
6. **Hit "Tamper (corrupt stored blob)"**, then **Verify Integrity again**
   — fails, and tells you exactly what's wrong. *This is the moment that
   sells the whole pitch.*
7. **Hit "Restore Original," verify again** — passes again.
8. **Go to Sealed Custody**, try unsealing with 2 of 5 custodians (denied),
   then 3 of 5 (succeeds).
9. **Generate a Hash Certificate PDF** from the Certificate tab.

---

## Known Limitations

Said out loud, proactively, in any pitch — this is what separates "we
understand security" from "we hope nobody asks":

- **The blockchain anchor is a single Python process, not a real
  multi-node network.** A real deployment needs police, courts, and
  forensic labs each running an independent node so no single organization
  controls the ledger. What's genuinely real here: the Merkle-root
  batching, block linking, and block signatures — the actual cryptographic
  mechanism, just not the distributed multi-party trust that makes a real
  blockchain valuable. This is the single biggest simplification in the
  project and the first thing to say if asked "so is this really a
  blockchain?"
- **The server holds every user's private keys** (for signing and
  decryption), encrypted at rest under SQLite rather than in an HSM. This
  is what lets `upload`/`retrieve`/`sign` all happen without a browser-side
  crypto component — but it means a full compromise of the server does
  expose keys. A real deployment keeps signing/decryption keys client-side
  or in an HSM, and the server never sees a private key at all.
- **JWT secret is a hardcoded dev value** in `services.py` — move to an
  environment variable before this touches anything real.
- **Searchable encryption indexes user-supplied tags/titles, not
  full-text OCR'd content.** Real full-text search over encrypted scanned
  documents needs OCR + a much larger encrypted index, noted as future work.
- **No key rotation or revocation.** If an officer leaves or a key is
  compromised, there's no mechanism here to re-wrap existing documents
  under a new key or revoke a certificate. Production needs a CRL/OCSP
  story and a re-keying procedure.
- **The demo still uses local filesystem blob storage instead of MinIO.**
  PostgreSQL now stores all relational metadata and cryptographic records;
  MinIO integration can replace `core/storage.py` without changing the
  database contract.
- **Certificate generation is NOT a legal opinion.** It illustrates the
  kind of artifact Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023
  asks for, generated from real cryptographic material — it is not
  certification by an authorized officer under that Act.

---

## Why these specific design choices

- **Envelope encryption enforces access control twice, redundantly.**
  `access_control.py`'s RBAC check is the app-layer gate — but even if that
  had a bug, `DocumentService.retrieve_document` still can't produce
  plaintext for a user with no `WrappedKey` row. Two independent failure
  modes have to both break before a wrong person sees a document.
- **Shamir's Secret Sharing is implemented byte-wise over GF(2⁸)**
  (`secret_sharing.py`), not as one big-integer prime-field scheme — this
  is the same technique tools like `ssss` and SLIP-39 use, and it sidesteps
  needing to pick and validate a >256-bit prime correctly. (An earlier
  version of this file used a non-primitive generator for the GF(2⁸)
  multiplication tables — caught by the test suite, which is exactly the
  kind of subtle cryptographic bug automated tests are for.)
- **The hash-chained audit log and the blockchain anchor are deliberately
  two separate, redundant layers.** The hash chain alone already gives
  tamper-evidence within one process; the blockchain anchor adds an
  *externally verifiable* checkpoint that doesn't require trusting
  SentinelVault's own database. Losing either one still leaves the other
  standing.

---

*Generated as a hackathon prototype — see the accompanying pitch deck and
strategy guide for the broader set of architectures considered before
settling on this one.*

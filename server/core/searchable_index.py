"""
searchable_index.py
====================
A minimal Searchable Symmetric Encryption (SSE) index: keywords are never
stored in the database in plaintext, only as HMAC "trapdoors" derived from a
search key that only search-authorized roles hold. A database administrator
(or an attacker with read access to the DB but not the search key) sees
opaque hex tokens mapping to document ids — they cannot tell what any token
means without the key, and cannot forge/guess new valid tokens either.

This is deliberately scoped: it indexes user-supplied tags/keywords at
upload time (case number, document type, free-text tags), NOT full-text
content — full-text search would require OCR/extraction and a much larger
encrypted-index scheme (see the "stretch goals" in the project README).
Honesty about that scope is itself part of the design, not a shortcut we're
hiding.

Known limitation (documented, not hidden): this scheme leaks *access
patterns* — the server learns which trapdoor was queried and which document
ids matched, even though it never learns the keyword itself. That's a
standard, well-known SSE trade-off, not a bug.
"""
from __future__ import annotations

import hmac
import hashlib
import re


def _normalize(keyword: str) -> str:
    return keyword.strip().lower()


def _tokenize(text: str) -> set[str]:
    """Very small tokenizer: lowercase word/number tokens, 2+ chars."""
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return {t for t in tokens if len(t) >= 2}


def derive_trapdoor(search_key: bytes, keyword: str) -> str:
    """HMAC-SHA256(search_key, normalized_keyword) -> hex trapdoor token."""
    normalized = _normalize(keyword)
    return hmac.new(search_key, normalized.encode(), hashlib.sha256).hexdigest()


def build_trapdoors_for_text(search_key: bytes, *texts: str) -> set[str]:
    """
    Tokenize one or more free-text fields (title, doc type, tags) and return
    the full set of trapdoors to index this document under.
    """
    tokens: set[str] = set()
    for text in texts:
        if text:
            tokens |= _tokenize(text)
    return {derive_trapdoor(search_key, t) for t in tokens}


def query_trapdoor(search_key: bytes, query: str) -> set[str]:
    """Tokenize a search query the same way and return its trapdoors."""
    tokens = _tokenize(query)
    if not tokens:
        return set()
    return {derive_trapdoor(search_key, t) for t in tokens}

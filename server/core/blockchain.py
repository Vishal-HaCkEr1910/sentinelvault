"""
blockchain.py
=============
A simplified, single-process "permissioned chain" that anchors Merkle roots
of batches of audit-log entries. This is deliberately NOT a real multi-node
Hyperledger Fabric / Ethereum devnet — standing one of those up is
infrastructure, not cryptography, and is explicitly called out as a known
simplification in the README (a real deployment would have police, courts,
and forensic labs each running an independent node so no single
organization controls the ledger).

What IS real here, and is the actual point of the demo:
    - Each block cryptographically commits to a Merkle root of a batch of
      audit-log entry hashes (merkle.py).
    - Each block links to the previous block's hash (`prev_block_hash`),
      exactly like a real blockchain's block header chaining.
    - Each block is signed by the "network" key, so a block can't be forged
      without that key even if someone has raw database access.
    - `verify_chain()` walks every block from genesis and confirms both the
      block-linkage AND the block's internal signature.
    - Given any single anchored audit entry, `MerkleTree.verify_proof` (see
      merkle.py) proves it was included in a specific block's root WITHOUT
      needing to trust the database that stored it — that's the actual
      "externally verifiable integrity" property the whole pitch rests on.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from core.crypto_utils import sha256_hex, ec_sign, ec_verify, load_private_key_from_pem, load_public_key_from_pem
from core.merkle import MerkleTree, ProofStep

GENESIS_PREV_HASH = "0" * 64


@dataclass
class Block:
    index: int
    timestamp: float
    merkle_root: str
    prev_block_hash: str
    leaf_hashes: list[str]  # the ordered audit-entry hashes this block anchors (needed to rebuild proofs later)
    entry_ids: list[int]    # DB ids of the anchored audit entries, same order as leaf_hashes
    block_hash: str = field(default="")
    signature_hex: str = field(default="")

    def header_fields(self) -> dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "merkle_root": self.merkle_root,
            "prev_block_hash": self.prev_block_hash,
        }

    def compute_hash(self) -> str:
        return sha256_hex(json.dumps(self.header_fields(), sort_keys=True, separators=(",", ":")).encode())


def create_genesis_block(network_private_key_pem: str) -> Block:
    block = Block(
        index=0,
        timestamp=time.time(),
        merkle_root="0" * 64,
        prev_block_hash=GENESIS_PREV_HASH,
        leaf_hashes=[],
        entry_ids=[],
    )
    block.block_hash = block.compute_hash()
    priv = load_private_key_from_pem(network_private_key_pem)
    block.signature_hex = ec_sign(priv, bytes.fromhex(block.block_hash)).hex()
    return block


def anchor_batch(
    prev_block: Block,
    entry_hashes: list[str],
    entry_ids: list[int],
    network_private_key_pem: str,
) -> Block:
    """
    Build a Merkle tree over `entry_hashes`, wrap its root into a new block
    linked to `prev_block`, and sign it.
    """
    if not entry_hashes:
        raise ValueError("cannot anchor an empty batch")
    tree = MerkleTree(entry_hashes)
    block = Block(
        index=prev_block.index + 1,
        timestamp=time.time(),
        merkle_root=tree.root_hex,
        prev_block_hash=prev_block.block_hash,
        leaf_hashes=list(entry_hashes),
        entry_ids=list(entry_ids),
    )
    block.block_hash = block.compute_hash()
    priv = load_private_key_from_pem(network_private_key_pem)
    block.signature_hex = ec_sign(priv, bytes.fromhex(block.block_hash)).hex()
    return block


@dataclass
class ChainVerificationResult:
    valid: bool
    broken_at_index: int | None = None
    reason: str | None = None


def verify_chain(blocks: list[Block], network_public_key_pem: str) -> ChainVerificationResult:
    """Walk every block from genesis, checking linkage + signature."""
    pub_key = load_public_key_from_pem(network_public_key_pem)
    expected_prev = GENESIS_PREV_HASH
    for block in blocks:
        if block.prev_block_hash != expected_prev:
            return ChainVerificationResult(False, block.index, f"block {block.index}: prev_block_hash mismatch (chain broken)")
        recomputed = block.compute_hash()
        if recomputed != block.block_hash:
            return ChainVerificationResult(False, block.index, f"block {block.index}: header hash mismatch (block was altered)")
        if not ec_verify(pub_key, bytes.fromhex(block.block_hash), bytes.fromhex(block.signature_hex)):
            return ChainVerificationResult(False, block.index, f"block {block.index}: signature invalid (forged block)")
        expected_prev = block.block_hash
    return ChainVerificationResult(True)


def find_proof_for_entry(block: Block, entry_hash: str) -> list[ProofStep] | None:
    """Rebuild the Merkle tree for `block` and return the inclusion proof for `entry_hash`, if present."""
    if entry_hash not in block.leaf_hashes:
        return None
    tree = MerkleTree(block.leaf_hashes)
    idx = block.leaf_hashes.index(entry_hash)
    return tree.get_proof(idx)

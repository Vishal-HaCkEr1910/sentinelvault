"""
merkle.py
=========
A standard binary Merkle tree over SHA-256, used to batch many audit-log
entry hashes into a single small root that gets anchored on the blockchain
(blockchain.py). This is what lets us verify "was this specific document's
audit entry included in what we anchored on-chain?" without re-anchoring
every single entry individually.

Odd node counts at any level are handled by duplicating the last node
(the same convention Bitcoin's Merkle tree uses) — documented explicitly
here because it's a common source of subtle bugs if left implicit.
"""
from __future__ import annotations

from dataclasses import dataclass

from core.crypto_utils import sha256_bytes, sha256_hex


def _hash_pair(left: bytes, right: bytes) -> bytes:
    return sha256_bytes(left + right)


@dataclass
class ProofStep:
    sibling_hash: str  # hex
    is_left: bool       # True if sibling is the LEFT node (i.e. our node was on the right)


class MerkleTree:
    """
    Build once from an ordered list of hex leaf hashes. `root_hex` is the
    tree's Merkle root. `get_proof(index)` returns the sibling path needed
    to recompute the root from that single leaf.
    """

    def __init__(self, leaf_hashes_hex: list[str]):
        if not leaf_hashes_hex:
            raise ValueError("MerkleTree requires at least one leaf")
        self.leaves_hex = list(leaf_hashes_hex)
        self._levels: list[list[bytes]] = []
        self._build()

    def _build(self):
        level = [bytes.fromhex(h) for h in self.leaves_hex]
        self._levels.append(level)
        while len(level) > 1:
            if len(level) % 2 == 1:
                level = level + [level[-1]]  # duplicate last node convention
            next_level = [_hash_pair(level[i], level[i + 1]) for i in range(0, len(level), 2)]
            self._levels.append(next_level)
            level = next_level

    @property
    def root_hex(self) -> str:
        return self._levels[-1][0].hex()

    def get_proof(self, index: int) -> list[ProofStep]:
        if index < 0 or index >= len(self.leaves_hex):
            raise IndexError("leaf index out of range")
        proof: list[ProofStep] = []
        idx = index
        for level in self._levels[:-1]:
            level_len = len(level)
            # account for the duplicated-last-node convention at this level
            padded_len = level_len + (level_len % 2)
            sibling_idx = idx ^ 1  # XOR with 1 flips even<->odd (pair index)
            if sibling_idx >= level_len:
                sibling_idx = level_len - 1  # duplicated node
            sibling = level[sibling_idx]
            is_left = (idx % 2) == 1  # if we are the RIGHT node, sibling is LEFT
            proof.append(ProofStep(sibling_hash=sibling.hex(), is_left=is_left))
            idx = idx // 2
        return proof

    @staticmethod
    def verify_proof(leaf_hash_hex: str, proof: list[ProofStep], root_hex: str) -> bool:
        current = bytes.fromhex(leaf_hash_hex)
        for step in proof:
            sibling = bytes.fromhex(step.sibling_hash)
            current = _hash_pair(sibling, current) if step.is_left else _hash_pair(current, sibling)
        return current.hex() == root_hex

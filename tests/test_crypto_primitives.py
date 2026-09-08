"""
test_crypto_primitives.py
==========================
Unit tests for the primitives in core/: crypto_utils, merkle,
secret_sharing, hashchain, blockchain. These are pure functions/classes
with no database dependency, so they don't need the `fresh_db` fixture.
"""
import itertools
import os

from core import crypto_utils as cu
from core import merkle
from core import secret_sharing as sss
from core import hashchain
from core import blockchain as bc


# ---- crypto_utils ---------------------------------------------------------

def test_aes_gcm_round_trip():
    key = cu.generate_dek()
    nonce, ct = cu.aes_encrypt(key, b"secret evidence content")
    assert cu.aes_decrypt(key, nonce, ct) == b"secret evidence content"


def test_aes_gcm_detects_tamper():
    key = cu.generate_dek()
    nonce, ct = cu.aes_encrypt(key, b"secret evidence content")
    tampered = bytearray(ct)
    tampered[0] ^= 0xFF
    try:
        cu.aes_decrypt(key, nonce, bytes(tampered))
        assert False, "tampered ciphertext should have raised"
    except Exception:
        pass


def test_rsa_oaep_wrap_unwrap():
    kp = cu.new_rsa_keypair(2048)
    dek = cu.generate_dek()
    wrapped = cu.rsa_wrap_key(kp.public_key, dek)
    assert cu.rsa_unwrap_key(kp.private_key, wrapped) == dek


def test_ecdsa_sign_verify():
    kp = cu.new_ec_keypair()
    sig = cu.ec_sign(kp.private_key, b"audit entry")
    assert cu.ec_verify(kp.public_key, b"audit entry", sig)
    assert not cu.ec_verify(kp.public_key, b"different data", sig)


# ---- merkle -----------------------------------------------------------

def test_merkle_proof_verifies_for_every_leaf_count_parity():
    for n in (1, 2, 3, 5, 8, 13):
        leaves = [cu.sha256_hex(f"leaf-{i}".encode()) for i in range(n)]
        tree = merkle.MerkleTree(leaves)
        for i in range(n):
            proof = tree.get_proof(i)
            assert merkle.MerkleTree.verify_proof(leaves[i], proof, tree.root_hex)


def test_merkle_rejects_wrong_leaf_or_root():
    leaves = [cu.sha256_hex(f"leaf-{i}".encode()) for i in range(5)]
    tree = merkle.MerkleTree(leaves)
    proof = tree.get_proof(2)
    assert not merkle.MerkleTree.verify_proof(cu.sha256_hex(b"forged"), proof, tree.root_hex)
    assert not merkle.MerkleTree.verify_proof(leaves[2], proof, cu.sha256_hex(b"forged-root"))


# ---- secret_sharing --------------------------------------------------

def test_shamir_all_k_subsets_reconstruct():
    secret = os.urandom(32)
    k, n = 3, 5
    shares = sss.split_secret(secret, k, n)
    for combo in itertools.combinations(shares, k):
        assert sss.reconstruct_secret(list(combo)) == secret


def test_shamir_sub_threshold_does_not_reveal_secret():
    secret = os.urandom(32)
    k, n = 3, 5
    shares = sss.split_secret(secret, k, n)
    for combo in itertools.combinations(shares, k - 1):
        assert sss.reconstruct_secret(list(combo)) != secret


def test_shamir_rejects_invalid_params():
    try:
        sss.split_secret(b"x" * 32, 1, 5)
        assert False
    except ValueError:
        pass
    try:
        sss.split_secret(b"x" * 32, 5, 3)
        assert False
    except ValueError:
        pass


# ---- hashchain --------------------------------------------------------

def test_hashchain_detects_content_tamper():
    kp = cu.new_ec_keypair()
    pub_keys = {"alice": kp.public_pem}
    e0 = hashchain.create_entry(0, hashchain.GENESIS_HASH, "alice", "UPLOAD", 1, "doc A", kp.private_pem)
    e1 = hashchain.create_entry(1, e0.entry_hash, "alice", "VIEW", 1, "doc A viewed", kp.private_pem)

    assert hashchain.verify_chain([e0, e1], pub_keys).valid

    e0.details = "TAMPERED"
    result = hashchain.verify_chain([e0, e1], pub_keys)
    assert not result.valid
    assert result.broken_at_seq == 0


# ---- blockchain ---------------------------------------------------------

def test_blockchain_anchor_and_inclusion_proof():
    net = cu.new_ec_keypair()
    genesis = bc.create_genesis_block(net.private_pem)
    entry_hashes = [cu.sha256_hex(f"e{i}".encode()) for i in range(4)]
    block1 = bc.anchor_batch(genesis, entry_hashes, [1, 2, 3, 4], net.private_pem)

    result = bc.verify_chain([genesis, block1], net.public_pem)
    assert result.valid

    proof = bc.find_proof_for_entry(block1, entry_hashes[1])
    assert merkle.MerkleTree.verify_proof(entry_hashes[1], proof, block1.merkle_root)


def test_blockchain_detects_forged_block():
    net = cu.new_ec_keypair()
    forger = cu.new_ec_keypair()
    genesis = bc.create_genesis_block(net.private_pem)
    entry_hashes = [cu.sha256_hex(b"e0")]
    block1 = bc.anchor_batch(genesis, entry_hashes, [1], net.private_pem)

    # forge block1's signature with a different key
    block1.signature_hex = cu.ec_sign(forger.private_key, bytes.fromhex(block1.block_hash)).hex()
    result = bc.verify_chain([genesis, block1], net.public_pem)
    assert not result.valid

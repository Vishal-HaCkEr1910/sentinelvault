"""
secret_sharing.py
==================
Shamir's Secret Sharing (k-of-n threshold), implemented byte-wise over
GF(2^8) — the same finite field AES itself uses (Rijndael's field, modulus
polynomial 0x11B). This is the one primitive in the project not provided by
`cryptography`, so it's implemented and tested carefully here.

Why byte-wise GF(256) instead of one big prime field:
    Splitting a 256-bit AES key as a single big integer requires a prime
    larger than 2^256 and correct modular arithmetic across that whole
    range. Byte-wise GF(256) sharing (the same technique used by tools like
    `ssss` and SLIP-39) sidesteps that entirely: each of the 32 key bytes is
    shared independently with its own random polynomial, using the same x
    co-ordinate (the custodian's share index) across all 32 bytes. It's
    simpler to implement correctly and just as secure for this purpose.

Security property: with `k-1` or fewer shares, the reconstructed secret is
*information-theoretically* undetermined — not just computationally hard to
guess, actually mathematically ambiguous. That's what makes this a genuine
"no single party can unlock it" guarantee rather than an obfuscation trick.
"""
from __future__ import annotations

import os
from dataclasses import dataclass

# --------------------------------------------------------------------------
# GF(2^8) arithmetic (Rijndael's field: x^8 + x^4 + x^3 + x + 1, i.e. 0x11B)
# --------------------------------------------------------------------------

_EXP = [0] * 512
_LOG = [0] * 256


def _init_tables():
    # Generator must be a *primitive* element of GF(2^8) under 0x11B, i.e.
    # one whose powers cycle through all 255 nonzero field elements. 0x02
    # is NOT primitive for this polynomial (its order is only 51) — 0x03 is
    # the standard primitive element used for AES-family GF(2^8) tables.
    x = 1
    for i in range(255):
        _EXP[i] = x
        _LOG[x] = i
        # x = x * 3  (== x*2 XOR x, computed via the shift-and-reduce double)
        doubled = x << 1
        if doubled & 0x100:
            doubled ^= 0x11B
        x = doubled ^ x
    for i in range(255, 512):
        _EXP[i] = _EXP[i - 255]


_init_tables()


def gf_add(a: int, b: int) -> int:
    return a ^ b  # addition/subtraction in GF(2^n) is XOR


def gf_mul(a: int, b: int) -> int:
    if a == 0 or b == 0:
        return 0
    return _EXP[_LOG[a] + _LOG[b]]


def gf_pow(a: int, power: int) -> int:
    if a == 0:
        return 0
    return _EXP[(_LOG[a] * power) % 255]


def gf_inv(a: int) -> int:
    if a == 0:
        raise ZeroDivisionError("no inverse for 0 in GF(2^8)")
    return _EXP[255 - _LOG[a]]


def gf_div(a: int, b: int) -> int:
    if b == 0:
        raise ZeroDivisionError("division by zero in GF(2^8)")
    if a == 0:
        return 0
    return _EXP[(_LOG[a] - _LOG[b]) % 255]


# --------------------------------------------------------------------------
# Per-byte polynomial evaluation
# --------------------------------------------------------------------------

def _eval_poly(coeffs: list[int], x: int) -> int:
    """Evaluate polynomial (coeffs[0] + coeffs[1]*x + ...) at point x, in GF(2^8)."""
    result = 0
    x_pow = 1
    for c in coeffs:
        result = gf_add(result, gf_mul(c, x_pow))
        x_pow = gf_mul(x_pow, x)
    return result


@dataclass
class Share:
    x: int          # custodian index, 1..255 (never 0 — that's the secret point)
    y: bytes        # one evaluated byte per secret byte

    def to_hex(self) -> str:
        return f"{self.x:02x}" + self.y.hex()

    @staticmethod
    def from_hex(s: str) -> "Share":
        x = int(s[:2], 16)
        y = bytes.fromhex(s[2:])
        return Share(x=x, y=y)


def split_secret(secret: bytes, k: int, n: int) -> list[Share]:
    """
    Split `secret` into `n` shares such that any `k` of them reconstruct it,
    but any `k-1` reveal nothing about it.
    """
    if k < 2:
        raise ValueError("threshold k must be >= 2 (k=1 isn't secret sharing)")
    if n < k:
        raise ValueError("n must be >= k")
    if n > 255:
        raise ValueError("n must be <= 255 (GF(2^8) has only 255 nonzero points)")

    xs = list(range(1, n + 1))  # custodian indices 1..n
    shares_y = [bytearray() for _ in xs]

    for secret_byte in secret:
        # random polynomial of degree k-1 with constant term = this secret byte
        coeffs = [secret_byte] + [os.urandom(1)[0] for _ in range(k - 1)]
        for i, x in enumerate(xs):
            shares_y[i].append(_eval_poly(coeffs, x))

    return [Share(x=xs[i], y=bytes(shares_y[i])) for i in range(n)]


def reconstruct_secret(shares: list[Share]) -> bytes:
    """
    Reconstruct the secret from >= k shares via Lagrange interpolation at
    x=0, done independently per byte position, in GF(2^8).
    """
    if len(shares) < 2:
        raise ValueError("need at least 2 shares to attempt reconstruction")
    secret_len = len(shares[0].y)
    if any(len(s.y) != secret_len for s in shares):
        raise ValueError("all shares must be the same length (same secret)")

    result = bytearray()
    for byte_idx in range(secret_len):
        total = 0
        for i, share_i in enumerate(shares):
            xi, yi = share_i.x, share_i.y[byte_idx]
            # Lagrange basis polynomial L_i(0) = product over j != i of (0 - x_j) / (x_i - x_j)
            num = 1
            den = 1
            for j, share_j in enumerate(shares):
                if i == j:
                    continue
                xj = share_j.x
                num = gf_mul(num, xj)              # (0 - x_j) == x_j in GF(2^n)
                den = gf_mul(den, gf_add(xi, xj))    # (x_i - x_j) == x_i ^ x_j
            li_0 = gf_div(num, den)
            total = gf_add(total, gf_mul(yi, li_0))
        result.append(total)
    return bytes(result)

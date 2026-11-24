"""UUIDv7 primary keys (SCHEMA.md "Global rules").

A UUIDv7 starts with the time in milliseconds, so new rows land at the end of the
B-tree index (fast inserts) while staying unguessable. Postgres 17 and Python 3.13
don't generate them yet (Postgres 18 and Python 3.14 do), so we do, per RFC 9562.
"""

import os
import time
import uuid

_RAND_A_BITS = 12
_RAND_B_BITS = 62


def uuid7() -> uuid.UUID:
    unix_ms = time.time_ns() // 1_000_000
    rand = int.from_bytes(os.urandom(10), "big")
    rand_a = rand >> (80 - _RAND_A_BITS)
    rand_b = rand & ((1 << _RAND_B_BITS) - 1)
    value = (
        (unix_ms & ((1 << 48) - 1)) << 80  # 48-bit timestamp
        | 0x7 << 76  # version 7
        | rand_a << 64
        | 0b10 << 62  # RFC variant
        | rand_b
    )
    return uuid.UUID(int=value)

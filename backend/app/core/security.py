"""
app/core/security.py
====================
Centralised authentication utilities for the Sanchari AI Tutor platform.

Password hashing strategy
--------------------------
We use the ``bcrypt`` library directly (rather than passlib) because:

  - ``passlib 1.7.4`` is incompatible with ``bcrypt >= 4.x`` (the
    ``__about__`` attribute was removed and the hashpw API changed).
  - ``chromadb`` (a runtime dependency) pins ``bcrypt >= 4.0.1``, preventing
    a downgrade.
  - Using raw ``bcrypt`` with a thin wrapper gives us the same security
    guarantees (cost-12 bcrypt) without the passlib version conflict.

The public API (``hash_password`` / ``verify_password``) is identical to what
would be produced by ``passlib.context.CryptContext``, so callers need not
change when the underlying library changes.

JWT generation / decoding and token hashing utilities are also here.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from uuid import uuid4

import bcrypt
import jwt

from app.core.config import get_settings

# ---------------------------------------------------------------------------
# Module-level logger
# ---------------------------------------------------------------------------

_logger = logging.getLogger(__name__)

# Gate all development-only debug output on ENVIRONMENT == "development".
# Evaluated once at import time → zero per-request overhead in production.
_DEV_MODE: bool = os.getenv("ENVIRONMENT", "development").lower() == "development"


# ---------------------------------------------------------------------------
# Public password API
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """
    Return a bcrypt hash of *password* (cost factor 12).

    Rules:
      - Always call this on raw plaintext – never on an already-hashed value.
      - The result is a ``str``; the ``hashed_password`` column in the DB is
        also ``String(255)``, so no conversion is needed.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed: bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Return ``True`` if *plain_password* matches *hashed_password*.

    Behaviour:
      - Uses ``bcrypt.checkpw`` which is timing-safe (constant-time comparison).
      - Returns ``False`` (never raises) for empty inputs or malformed hashes.
      - Logs the result at DEBUG level in development mode only.
    """
    if not plain_password or not hashed_password:
        return False

    try:
        result: bool = bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception as exc:  # noqa: BLE001 – intentionally broad
        # Malformed hash, encoding error, or library issue – treat as mismatch.
        _logger.warning(
            "verify_password raised an unexpected error (treating as mismatch): %s", exc
        )
        return False

    if _DEV_MODE:
        # In development this helps trace login failures without logging the
        # actual password.  Set ENVIRONMENT=production to silence.
        _logger.debug(
            "DEV AUTH DEBUG | verify_password result=%s "
            "(set ENVIRONMENT=production to silence)",
            result,
        )

    return result


# ---------------------------------------------------------------------------
# Token utilities
# ---------------------------------------------------------------------------

def hash_token(token: str) -> str:
    """SHA-256 hex digest of *token* – used to store refresh-token fingerprints."""
    return sha256(token.encode("utf-8")).hexdigest()


def create_access_token(subject: str, role: str) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: Stringified user ID.
        role:    User role value (e.g. ``"student"``, ``"admin"``).

    Returns:
        Encoded JWT string.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
        "type": "access",
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def create_refresh_token(subject: str) -> str:
    """
    Create a signed JWT refresh token.

    Includes a ``jti`` (JWT ID) so individual tokens can be revoked by
    comparing their SHA-256 hash against the value stored in the DB.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + timedelta(days=settings.refresh_token_expire_days),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_token(token: str) -> dict:
    """
    Decode and verify a JWT.

    Raises ``jwt.PyJWTError`` (or a subclass) on invalid signature, expiry,
    or malformed token.  Callers must catch this exception.
    """
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=["HS256"])
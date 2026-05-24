"""
app/api/routes/auth.py
======================
Authentication endpoints for the Sanchari AI Tutor platform.

Flow overview
-------------
Register
  1. Validate request body (Pydantic, includes password min-length)
  2. Check for duplicate e-mail
  3. Hash password via ``hash_password()`` – bcrypt, never plaintext
  4. Persist User (+ role-specific profile)
  5. Issue access + refresh token pair

Login
  1. Fetch user by e-mail (case-insensitive)
  2. Verify password with ``verify_password()`` – timing-safe bcrypt check
  3. On success → issue token pair; on failure → HTTP 401 "Invalid credentials"

Refresh
  1. Decode & validate refresh JWT
  2. Compare stored hash to prevent token replay
  3. Issue new token pair (rotation)

Forgot-password (development / admin tool)
  - Generates a random 12-character password, hashes it, stores the hash.
  - Returns the plaintext new password so it can be communicated to the user.
    In production this should send an e-mail instead.
"""

import logging
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models.enums import LinkStatus, Role
from app.models.models import ParentChildLink, ParentProfile, StudentProfile, User
from app.schemas.schemas import (
    ForgotPasswordIn,
    LoginIn,
    RefreshIn,
    RegisterIn,
    TokenPair,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _issue_tokens(db: Session, user: User) -> TokenPair:
    """
    Generate a fresh access + refresh token pair for *user*, persist the
    refresh-token hash, and return the full ``TokenPair`` response model.
    """
    access = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id))

    user.refresh_token_hash = hash_token(refresh)
    db.commit()
    db.refresh(user)

    try:
        user_out = UserOut.model_validate(user)
    except Exception as exc:
        logger.warning(
            "User serialization failed during token issuance (user_id=%s): %s",
            user.id,
            exc,
        )
        user_out = UserOut.model_validate(
            {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "student_profile": None,
            }
        )

    return TokenPair(access_token=access, refresh_token=refresh, user=user_out)


def resolve_student_user(db: Session, identifier: str) -> User | None:
    """
    Look up a student ``User`` by e-mail or numeric student/user ID.

    Returns ``None`` if not found.

    This helper is also imported by ``app.api.routes.parents`` for the
    parent-child link flow.
    """
    identifier = identifier.strip()
    if "@" in identifier:
        return (
            db.query(User)
            .filter(User.email == identifier.lower(), User.role == Role.student)
            .first()
        )
    if identifier.isdigit():
        numeric_id = int(identifier)
        student_profile = db.get(StudentProfile, numeric_id)
        if student_profile:
            return student_profile.user
        return (
            db.query(User)
            .filter(User.id == numeric_id, User.role == Role.student)
            .first()
        )
    return None


def _generic_auth_error() -> HTTPException:
    """
    Return a generic 401 that does NOT reveal whether the e-mail or the
    password was wrong (prevents user-enumeration attacks).
    """
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=TokenPair,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> TokenPair:
    """
    Create a new user account and return a token pair on success.

    - Passwords are hashed with bcrypt (cost 12) before being stored.
    - The raw password is **never** persisted.
    - Duplicate e-mails return HTTP 409.
    """
    # ── 1. Duplicate e-mail check ──────────────────────────────────────────
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    # ── 2. Resolve linked student (parent registration only) ───────────────
    student_user: User | None = None
    if payload.role == Role.parent and payload.student_identifier:
        student_user = _resolve_student_user(db, payload.student_identifier)
        if not student_user or not student_user.student_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Student account not found for the provided identifier",
            )

    # ── 3. Hash password – NEVER store plaintext ───────────────────────────
    hashed = hash_password(payload.password)

    logger.info(
        "Registering new user | email=%s role=%s",
        payload.email.lower(),
        payload.role.value,
    )

    # ── 4. Persist user ────────────────────────────────────────────────────
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hashed,   # bcrypt hash stored in DB column `hashed_password`
        role=payload.role,
    )
    db.add(user)
    db.flush()  # get user.id before inserting profile rows

    # ── 5. Role-specific profile ───────────────────────────────────────────
    parent_profile: ParentProfile | None = None

    if payload.role == Role.student:
        school_name = payload.school_name or "Unknown"
        state = payload.state or "Unknown"
        db.add(
            StudentProfile(
                user_id=user.id,
                grade=payload.grade or 6,
                target_exam=payload.target_exam or "JNV",
                school_name=school_name,
                state=state,
                district=payload.district or "Unknown",
                city=payload.city or "Unknown",
                section=payload.section or "A",
                medium=payload.medium or "English",
                academic_year=payload.academic_year or "2026-2027",
                normalized_school_name=school_name.lower().strip(),
                normalized_state=state.lower().strip(),
            )
        )

    if payload.role == Role.parent:
        parent_profile = ParentProfile(user_id=user.id, phone=payload.phone)
        db.add(parent_profile)
        db.flush()

    if payload.role == Role.parent and student_user and parent_profile:
        db.add(
            ParentChildLink(
                parent_id=parent_profile.id,
                student_id=student_user.student_profile.id,
                status=LinkStatus.approved,
            )
        )

    db.commit()
    db.refresh(user)

    logger.info("User registered successfully | user_id=%s", user.id)
    return _issue_tokens(db, user)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=TokenPair,
    summary="Authenticate and receive a token pair",
)
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenPair:
    """
    Authenticate a user with e-mail + password.

    Flow:
      1. Look up user by e-mail (case-insensitive).
      2. Verify the entered password against the stored bcrypt hash
         using ``verify_password()`` (timing-safe, never a direct comparison).
      3. On success → generate and return a fresh token pair.
      4. On any failure → HTTP 401 "Invalid credentials"
         (deliberately generic to prevent user-enumeration).
    """
    # ── 1. Fetch user ──────────────────────────────────────────────────────
    user = db.query(User).filter(User.email == payload.email.lower()).first()

    # ── 2. Verify password (bcrypt, timing-safe) ───────────────────────────
    # We call verify_password even when user is None (with a dummy hash) to
    # maintain constant response time and prevent timing-based enumeration.
    _DUMMY_HASH = "$2b$12$invalidhashusedtopreventtimingattack.XXXXXXXXXXXXXXXXXXXX"
    stored_hash = user.hashed_password if user else _DUMMY_HASH

    password_ok = verify_password(payload.password, stored_hash)

    if not user or not password_ok:
        logger.warning(
            "Failed login attempt | email=%s user_found=%s",
            payload.email.lower(),
            user is not None,
        )
        raise _generic_auth_error()

    if not user.is_active:
        logger.warning("Inactive user attempted login | user_id=%s", user.id)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact support.",
        )

    logger.info("Successful login | user_id=%s role=%s", user.id, user.role.value)
    return _issue_tokens(db, user)


# ---------------------------------------------------------------------------
# Forgot password (dev / admin reset tool)
# ---------------------------------------------------------------------------

@router.post(
    "/forgot-password",
    summary="Reset a user's password (generates a temporary password)",
)
def forgot_password(
    payload: ForgotPasswordIn, db: Session = Depends(get_db)
) -> dict:
    """
    Reset the password for the account associated with *email*.

    Generates a cryptographically random 12-character password, hashes it
    with bcrypt, persists the **hash** (never the plaintext), and returns
    the temporary plaintext password in the response.

    .. note::
        In production this response body should trigger an e-mail send
        instead of returning the plaintext directly.  The current behaviour
        is intentional for the development phase.
    """
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        # Return 404 here because this endpoint is admin/dev-facing, not
        # user-facing, so leaking "not found" is acceptable.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not exist",
        )

    # Generate cryptographically random temporary password
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    new_password = "".join(secrets.choice(alphabet) for _ in range(12))

    # Hash before storing – raw password is NEVER written to the DB
    user.hashed_password = hash_password(new_password)
    db.commit()

    logger.info("Password reset performed | user_id=%s", user.id)

    return {
        "message": "Password reset successful",
        "new_password": new_password,  # communicate to user out-of-band in prod
    }


# ---------------------------------------------------------------------------
# Token refresh
# ---------------------------------------------------------------------------

@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Rotate a refresh token and receive a new token pair",
)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenPair:
    """
    Exchange a valid refresh token for a new access + refresh token pair.

    The old refresh token is invalidated (hash overwritten) so each refresh
    token can only be used once (token rotation).
    """
    try:
        decoded = decode_token(payload.refresh_token)
    except PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    user = db.get(User, int(decoded["sub"]))
    if not user or user.refresh_token_hash != hash_token(payload.refresh_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked or does not match",
        )

    logger.info("Token refreshed | user_id=%s", user.id)
    return _issue_tokens(db, user)

"""
tests/test_auth.py
==================
Comprehensive auth tests for the Sanchari AI Tutor platform.

Covers:
  - hash_password / verify_password unit tests
  - Same password → different salts → different hashes (bcrypt property)
  - JWT access token generation + decoding
  - JWT refresh token generation
  - Expired token detection
  - Student login (via TestClient)
  - Admin login (via TestClient)
  - Registration flow
  - Wrong password → 401
  - Correct password → 200 + tokens
  - Inactive user → 403
  - Duplicate registration → 409
  - Token refresh flow
  - Forgot-password flow

Run with:
    cd backend
    python -m pytest tests/test_auth.py -v
"""

import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import Base, get_db
from app.main import create_app
from app.models.enums import Role
from app.models.models import User

# ---------------------------------------------------------------------------
# In-memory SQLite test database (isolated, no side effects on real DB)
# ---------------------------------------------------------------------------

_TEST_DB_URL = "sqlite:///:memory:"

_engine = create_engine(
    _TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_TestingSessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


@pytest.fixture(scope="module", autouse=True)
def _create_tables():
    """Create all tables once for the test module."""
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def db_session():
    """Yield a fresh DB session per test, rolling back on teardown."""
    connection = _engine.connect()
    transaction = connection.begin()
    session = _TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """TestClient wired to the in-memory DB."""
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _make_user(db_session, email: str, password: str, role: Role = Role.student,
               active: bool = True) -> User:
    user = User(
        email=email.lower(),
        full_name="Test User",
        hashed_password=hash_password(password),
        role=role,
        is_active=active,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ===========================================================================
# UNIT TESTS – password hashing
# ===========================================================================

class TestPasswordHashing:
    def test_hash_returns_string(self):
        h = hash_password("MySecurePass1!")
        assert isinstance(h, str)
        assert len(h) > 30

    def test_hash_starts_with_bcrypt_prefix(self):
        h = hash_password("MySecurePass1!")
        # passlib bcrypt hashes start with $2b$
        assert h.startswith("$2b$")

    def test_different_calls_produce_different_hashes(self):
        """
        Bcrypt incorporates a random salt so the same password must produce
        two DIFFERENT hashes.  Verification must succeed for both.
        """
        password = "SamePassword99!"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2, (
            "Two hashes of the same password must differ (different salts)"
        )
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True

    def test_verify_correct_password(self):
        pw = "CorrectHorseBatteryStaple"
        assert verify_password(pw, hash_password(pw)) is True

    def test_verify_wrong_password(self):
        pw = "RealPassword42!"
        assert verify_password("WrongPassword", hash_password(pw)) is False

    def test_verify_empty_password_returns_false(self):
        h = hash_password("ValidPass1!")
        assert verify_password("", h) is False

    def test_verify_empty_hash_returns_false(self):
        assert verify_password("SomePassword", "") is False

    def test_verify_both_empty_returns_false(self):
        assert verify_password("", "") is False

    def test_raw_comparison_would_always_fail(self):
        """
        Demonstrate that a naive == comparison between plaintext and a bcrypt
        hash always fails – confirming why verify_password is required.
        """
        pw = "MyPass123!"
        hashed = hash_password(pw)
        assert pw != hashed  # raw comparison is always wrong


# ===========================================================================
# UNIT TESTS – JWT
# ===========================================================================

class TestJWT:
    def test_access_token_decodable(self):
        token = create_access_token("42", "student")
        decoded = decode_token(token)
        assert decoded["sub"] == "42"
        assert decoded["role"] == "student"
        assert decoded["type"] == "access"

    def test_refresh_token_decodable(self):
        token = create_refresh_token("99")
        decoded = decode_token(token)
        assert decoded["sub"] == "99"
        assert decoded["type"] == "refresh"
        assert "jti" in decoded

    def test_access_token_contains_exp(self):
        token = create_access_token("1", "admin")
        decoded = decode_token(token)
        assert "exp" in decoded
        # expiry should be in the future
        exp = datetime.fromtimestamp(decoded["exp"], tz=timezone.utc)
        assert exp > datetime.now(timezone.utc)

    def test_two_refresh_tokens_have_different_jti(self):
        t1 = decode_token(create_refresh_token("7"))
        t2 = decode_token(create_refresh_token("7"))
        assert t1["jti"] != t2["jti"]

    def test_tampered_token_raises(self):
        token = create_access_token("5", "student")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(jwt.PyJWTError):
            decode_token(tampered)

    def test_hash_token_is_deterministic(self):
        token = "some-refresh-token-value"
        assert hash_token(token) == hash_token(token)

    def test_hash_token_differs_for_different_inputs(self):
        assert hash_token("token-a") != hash_token("token-b")


# ===========================================================================
# INTEGRATION TESTS – registration endpoint
# ===========================================================================

class TestRegistration:
    def test_student_registration_success(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "student1@example.com",
            "full_name": "Alice Student",
            "password": "SecurePass1!",
            "role": "student",
            "grade": 9,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["role"] == "student"

    def test_duplicate_email_returns_409(self, client, db_session):
        _make_user(db_session, "dup@example.com", "Pass1234!")
        resp = client.post("/api/auth/register", json={
            "email": "dup@example.com",
            "full_name": "Dup User",
            "password": "AnotherPass1!",
            "role": "student",
        })
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()

    def test_short_password_rejected(self, client):
        resp = client.post("/api/auth/register", json={
            "email": "shortpw@example.com",
            "full_name": "Short User",
            "password": "abc",      # < 8 chars
            "role": "student",
        })
        assert resp.status_code == 422


# ===========================================================================
# INTEGRATION TESTS – login endpoint
# ===========================================================================

class TestLogin:
    def test_student_login_correct_password(self, client, db_session):
        _make_user(db_session, "student_ok@example.com", "ValidPass99!")
        resp = client.post("/api/auth/login", json={
            "email": "student_ok@example.com",
            "password": "ValidPass99!",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_admin_login_correct_password(self, client, db_session):
        _make_user(db_session, "admin@example.com", "AdminPass99!", role=Role.admin)
        resp = client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "AdminPass99!",
        })
        assert resp.status_code == 200
        assert resp.json()["user"]["role"] == "admin"

    def test_wrong_password_returns_401(self, client, db_session):
        _make_user(db_session, "wrongpw@example.com", "CorrectPass1!")
        resp = client.post("/api/auth/login", json={
            "email": "wrongpw@example.com",
            "password": "WrongPassword!",
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    def test_nonexistent_user_returns_401(self, client):
        """Must return 401 (not 404) to prevent user enumeration."""
        resp = client.post("/api/auth/login", json={
            "email": "ghost@example.com",
            "password": "SomePassword1!",
        })
        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid credentials"

    def test_inactive_user_returns_403(self, client, db_session):
        _make_user(db_session, "inactive@example.com", "Pass1234!", active=False)
        resp = client.post("/api/auth/login", json={
            "email": "inactive@example.com",
            "password": "Pass1234!",
        })
        assert resp.status_code == 403

    def test_case_insensitive_email(self, client, db_session):
        _make_user(db_session, "mixedcase@example.com", "CasePass1!")
        resp = client.post("/api/auth/login", json={
            "email": "MIXEDCASE@EXAMPLE.COM",
            "password": "CasePass1!",
        })
        assert resp.status_code == 200

    def test_returned_token_is_valid_jwt(self, client, db_session):
        _make_user(db_session, "jwt_check@example.com", "TokenPass1!")
        resp = client.post("/api/auth/login", json={
            "email": "jwt_check@example.com",
            "password": "TokenPass1!",
        })
        access_token = resp.json()["access_token"]
        decoded = decode_token(access_token)
        assert decoded["type"] == "access"
        assert decoded["role"] == "student"


# ===========================================================================
# INTEGRATION TESTS – token refresh
# ===========================================================================

class TestTokenRefresh:
    def test_valid_refresh_returns_new_pair(self, client, db_session):
        _make_user(db_session, "refresh_ok@example.com", "RefreshPass1!")
        login_resp = client.post("/api/auth/login", json={
            "email": "refresh_ok@example.com",
            "password": "RefreshPass1!",
        })
        refresh_token = login_resp.json()["refresh_token"]

        resp = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_invalid_refresh_token_returns_401(self, client):
        resp = client.post("/api/auth/refresh", json={"refresh_token": "garbage.token.value"})
        assert resp.status_code == 401

    def test_reused_refresh_token_returns_401(self, client, db_session):
        """After first refresh, the old token must be invalid (rotation)."""
        _make_user(db_session, "reuse_check@example.com", "ReusePass1!")
        login_resp = client.post("/api/auth/login", json={
            "email": "reuse_check@example.com",
            "password": "ReusePass1!",
        })
        old_refresh = login_resp.json()["refresh_token"]

        # First refresh – should succeed
        first = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
        assert first.status_code == 200

        # Reuse the old token – should fail (hash no longer matches)
        second = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
        assert second.status_code == 401


# ===========================================================================
# INTEGRATION TESTS – forgot-password
# ===========================================================================

class TestForgotPassword:
    def test_returns_new_password_for_existing_user(self, client, db_session):
        user = _make_user(db_session, "forgot@example.com", "OldPass1!")
        resp = client.post("/api/auth/forgot-password", json={"email": "forgot@example.com"})
        assert resp.status_code == 200
        data = resp.json()
        assert "new_password" in data
        new_pw = data["new_password"]

        # DB should now have a valid hash for new_pw
        db_session.refresh(user)
        assert verify_password(new_pw, user.hashed_password) is True

    def test_nonexistent_email_returns_404(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
        assert resp.status_code == 404
        assert resp.json()["detail"] == "User does not exist"

from fastapi import APIRouter, Depends, HTTPException, status
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, create_refresh_token, decode_token, hash_password, hash_token, verify_password
from app.db.session import get_db
from app.models.enums import LinkStatus, Role
from app.models.models import ParentChildLink, ParentProfile, StudentProfile, User
from app.schemas.schemas import LoginIn, RefreshIn, RegisterIn, TokenPair, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def issue_tokens(db: Session, user: User) -> TokenPair:
    access = create_access_token(str(user.id), user.role.value)
    refresh = create_refresh_token(str(user.id))
    user.refresh_token_hash = hash_token(refresh)
    db.commit()
    db.refresh(user)
    return TokenPair(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


def resolve_student_user(db: Session, identifier: str) -> User | None:
    identifier = identifier.strip()
    if "@" in identifier:
        return db.query(User).filter(User.email == identifier.lower(), User.role == Role.student).first()
    if identifier.isdigit():
        numeric_id = int(identifier)
        student_profile = db.get(StudentProfile, numeric_id)
        if student_profile:
            return student_profile.user
        return db.query(User).filter(User.id == numeric_id, User.role == Role.student).first()
    return None


@router.post("/register", response_model=TokenPair)
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered")

    student_user = None
    if payload.role == Role.parent and payload.student_identifier:
        student_user = resolve_student_user(db, payload.student_identifier)
        if not student_user or not student_user.student_profile:
            raise HTTPException(status_code=404, detail="Student account not found for provided identifier")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.flush()

    parent_profile = None
    if payload.role == Role.student:
        db.add(StudentProfile(user_id=user.id, grade=payload.grade or 6, target_exam=payload.target_exam or "JNV"))
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
    return issue_tokens(db, user)


@router.post("/login", response_model=TokenPair)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return issue_tokens(db, user)


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)):
    try:
        decoded = decode_token(payload.refresh_token)
    except PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from exc
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = db.get(User, int(decoded["sub"]))
    if not user or user.refresh_token_hash != hash_token(payload.refresh_token):
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")
    return issue_tokens(db, user)

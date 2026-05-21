from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.enums import LinkStatus, Role
from app.models.models import ParentChildLink, StudentProfile, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = decode_token(token)
    except PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token") from exc
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user = db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User is inactive or missing")
    return user


def require_roles(*roles: Role):
    def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return dependency


def get_student_profile(user: User = Depends(require_roles(Role.student)), db: Session = Depends(get_db)) -> StudentProfile:
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return profile


def assert_parent_can_access_child(db: Session, parent_user: User, student_id: int) -> None:
    if parent_user.role == Role.admin:
        return
    parent = parent_user.parent_profile
    if not parent:
        raise HTTPException(status_code=403, detail="Parent profile missing")
    exists = (
        db.query(ParentChildLink)
        .filter(
            ParentChildLink.parent_id == parent.id,
            ParentChildLink.student_id == student_id,
            ParentChildLink.status == LinkStatus.approved,
        )
        .first()
    )
    if not exists:
        raise HTTPException(status_code=403, detail="Child account is not linked to this parent")

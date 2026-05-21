from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.api.routes.auth import resolve_student_user
from app.db.session import get_db
from app.models.enums import LinkStatus, Role
from app.models.models import ParentChildLink, User
from app.schemas.schemas import ParentChildOut, ParentLinkIn

router = APIRouter(prefix="/parents", tags=["parents"])


@router.post("/links", response_model=ParentChildOut)
def request_child_link(payload: ParentLinkIn, user: User = Depends(require_roles(Role.parent)), db: Session = Depends(get_db)):
    student_user = resolve_student_user(db, payload.student_identifier)
    if not student_user or not student_user.student_profile:
        raise HTTPException(status_code=404, detail="Student account not found")
    existing = (
        db.query(ParentChildLink)
        .filter(
            ParentChildLink.parent_id == user.parent_profile.id,
            ParentChildLink.student_id == student_user.student_profile.id,
        )
        .first()
    )
    if existing:
        return ParentChildOut(
            link_id=existing.id,
            student_id=existing.student_id,
            student_name=student_user.full_name,
            status=existing.status.value,
        )
    link = ParentChildLink(
        parent_id=user.parent_profile.id,
        student_id=student_user.student_profile.id,
        status=LinkStatus.approved,
    )
    db.add(link)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This child account is already linked") from exc
    db.refresh(link)
    return ParentChildOut(link_id=link.id, student_id=link.student_id, student_name=student_user.full_name, status=link.status.value)


@router.get("/children", response_model=list[ParentChildOut])
def children(user: User = Depends(require_roles(Role.parent)), db: Session = Depends(get_db)):
    links = db.query(ParentChildLink).filter(ParentChildLink.parent_id == user.parent_profile.id).all()
    return [
        ParentChildOut(
            link_id=link.id,
            student_id=link.student_id,
            student_name=link.student.user.full_name,
            status=link.status.value,
        )
        for link in links
    ]

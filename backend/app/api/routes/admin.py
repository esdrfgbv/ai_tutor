from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.config import get_settings
from app.db.session import get_db
from app.models.enums import LinkStatus, Role
from app.models.models import Announcement, ParentChildLink, User
from app.schemas.schemas import AnnouncementIn, AnnouncementOut

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
def list_users(role: Role | None = None, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role.value, "active": u.is_active} for u in query.limit(200).all()]


@router.post("/parent-links/{link_id}/approve")
def approve_link(link_id: int, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    link = db.get(ParentChildLink, link_id)
    if not link:
        raise HTTPException(status_code=404, detail="Parent-child link not found")
    link.status = LinkStatus.approved
    db.commit()
    return {"status": "approved"}


@router.get("/parent-links")
def parent_links(status: LinkStatus | None = None, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    query = db.query(ParentChildLink)
    if status:
        query = query.filter(ParentChildLink.status == status)
    links = query.order_by(ParentChildLink.created_at.desc()).limit(200).all()
    return [
        {
            "link_id": link.id,
            "status": link.status.value,
            "parent_name": link.parent.user.full_name,
            "parent_email": link.parent.user.email,
            "student_id": link.student_id,
            "student_name": link.student.user.full_name,
            "student_email": link.student.user.email,
            "created_at": link.created_at.isoformat(),
        }
        for link in links
    ]


@router.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), _: User = Depends(require_roles(Role.admin))):
    upload_dir = Path(get_settings().upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    target = upload_dir / file.filename
    target.write_bytes(await file.read())
    return {"file_path": str(target), "message": "Uploaded. Run ingestion to index the document."}


@router.post("/users/{user_id}/verify")
def verify_user(user_id: int, active: bool = True, _: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = active
    db.commit()
    return {"id": user.id, "active": user.is_active}


@router.post("/announcements", response_model=AnnouncementOut)
def create_announcement(payload: AnnouncementIn, user: User = Depends(require_roles(Role.admin)), db: Session = Depends(get_db)):
    announcement = Announcement(**payload.model_dump(), created_by_id=user.id)
    db.add(announcement)
    db.commit()
    db.refresh(announcement)
    return announcement

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import StudyBookmark, User
from app.schemas.schemas import StudyBookmarkIn, StudyBookmarkOut

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post("", response_model=StudyBookmarkOut)
def create_bookmark(
    payload: StudyBookmarkIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a bookmarked text selection."""
    bookmark = StudyBookmark(
        user_id=user.id,
        module_slug=payload.module_slug,
        subject=payload.subject,
        chapter_title=payload.chapter_title,
        selected_text=payload.selected_text,
        page_number=payload.page_number,
        grade=payload.grade,
    )
    db.add(bookmark)
    db.commit()
    db.refresh(bookmark)
    return bookmark


@router.get("", response_model=list[StudyBookmarkOut])
def list_bookmarks(
    module_slug: str | None = None,
    subject: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List bookmarks for the current user, optionally filtered."""
    query = db.query(StudyBookmark).filter_by(user_id=user.id)

    if module_slug:
        query = query.filter(StudyBookmark.module_slug == module_slug)
    if subject:
        query = query.filter(StudyBookmark.subject == subject)

    return query.order_by(StudyBookmark.created_at.desc()).limit(100).all()


@router.delete("/{bookmark_id}")
def delete_bookmark(
    bookmark_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a bookmark."""
    bookmark = db.get(StudyBookmark, bookmark_id)
    if not bookmark or bookmark.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bookmark not found")
    db.delete(bookmark)
    db.commit()
    return {"status": "deleted"}

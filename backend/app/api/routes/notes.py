from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.models import StudyNote, User
from app.schemas.schemas import StudyNoteIn, StudyNoteOut

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("", response_model=StudyNoteOut)
def create_note(
    payload: StudyNoteIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a new study note."""
    note = StudyNote(
        user_id=user.id,
        module_slug=payload.module_slug,
        subject=payload.subject,
        chapter_title=payload.chapter_title,
        content=payload.content,
        selected_text=payload.selected_text,
        source_page=payload.source_page,
        grade=payload.grade,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("", response_model=list[StudyNoteOut])
def list_notes(
    module_slug: str | None = None,
    subject: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notes for the current user, optionally filtered."""
    query = db.query(StudyNote).filter_by(user_id=user.id)

    if module_slug:
        query = query.filter(StudyNote.module_slug == module_slug)
    if subject:
        query = query.filter(StudyNote.subject == subject)

    return query.order_by(StudyNote.created_at.desc()).limit(100).all()


@router.delete("/{note_id}")
def delete_note(
    note_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a note."""
    note = db.get(StudyNote, note_id)
    if not note or note.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"status": "deleted"}

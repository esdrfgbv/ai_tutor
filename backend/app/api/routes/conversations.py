from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.logging import get_logger
from app.db.session import get_db
from app.models.models import Conversation, ConversationMessage, User
from app.schemas.schemas import (
    ConversationCreateIn,
    ConversationListItem,
    ConversationMessageIn,
    ConversationMessageOut,
    ConversationOut,
    RecentDoubtOut,
)
from app.services.ai_service import get_ai_provider

logger = get_logger(__name__)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut)
def create_or_get_conversation(
    payload: ConversationCreateIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new conversation or return existing one for this user+module."""
    existing = (
        db.query(Conversation)
        .filter_by(user_id=user.id, module_slug=payload.module_slug)
        .first()
    )

    if existing:
        # Update chapter title if changed
        if payload.chapter_title and existing.chapter_title != payload.chapter_title:
            existing.chapter_title = payload.chapter_title
            db.commit()
            db.refresh(existing)
        return existing

    conv = Conversation(
        user_id=user.id,
        subject=payload.subject,
        module_slug=payload.module_slug,
        chapter_title=payload.chapter_title,
        grade=payload.grade,
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


@router.get("", response_model=list[ConversationListItem])
def list_conversations(
    subject: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all conversations for the current user."""
    query = db.query(Conversation).filter_by(user_id=user.id)

    if subject:
        query = query.filter(Conversation.subject == subject)

    conversations = query.order_by(Conversation.updated_at.desc()).limit(50).all()

    result = []
    for conv in conversations:
        last_msg = (
            db.query(ConversationMessage)
            .filter_by(conversation_id=conv.id, role="user")
            .order_by(ConversationMessage.created_at.desc())
            .first()
        )
        msg_count = db.query(func.count(ConversationMessage.id)).filter_by(conversation_id=conv.id).scalar()

        result.append(
            ConversationListItem(
                id=conv.id,
                subject=conv.subject,
                module_slug=conv.module_slug,
                chapter_title=conv.chapter_title,
                last_message=last_msg.content[:100] if last_msg else None,
                message_count=msg_count or 0,
                updated_at=conv.updated_at,
            )
        )
    return result


@router.get("/recent", response_model=list[RecentDoubtOut])
def get_recent_doubts(
    module_slug: str | None = None,
    limit: int = 10,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get recent user questions across conversations."""
    query = (
        db.query(ConversationMessage)
        .join(Conversation)
        .filter(Conversation.user_id == user.id, ConversationMessage.role == "user")
    )

    if module_slug:
        query = query.filter(Conversation.module_slug == module_slug)

    recent = query.order_by(ConversationMessage.created_at.desc()).limit(limit).all()

    return [
        RecentDoubtOut(
            id=msg.id,
            question=msg.content[:150],
            conversation_id=msg.conversation_id,
            module_slug=msg.conversation.module_slug,
            chapter_title=msg.conversation.chapter_title,
            created_at=msg.created_at,
        )
        for msg in recent
    ]


@router.get("/{conversation_id}", response_model=ConversationOut)
def get_conversation(
    conversation_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single conversation with all messages."""
    conv = db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return conv


@router.post("/{conversation_id}/messages", response_model=ConversationMessageOut)
def send_message(
    conversation_id: int,
    payload: ConversationMessageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a message and get an AI response."""
    conv = db.get(Conversation, conversation_id)
    if not conv or conv.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    # Save user message
    user_msg = ConversationMessage(
        conversation_id=conv.id,
        role="user",
        content=payload.question,
        selected_text=payload.selected_text,
        page_number=payload.current_page,
    )
    db.add(user_msg)

    # Build context-aware prompt
    system_prompt = _build_system_prompt(conv, payload)

    # Get last N messages for history
    history = (
        db.query(ConversationMessage)
        .filter_by(conversation_id=conv.id)
        .order_by(ConversationMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history.reverse()

    history_text = ""
    for msg in history:
        role_label = "Student" if msg.role == "user" else "Tutor"
        history_text += f"{role_label}: {msg.content}\n"

    full_prompt = f"{system_prompt}\n\n"
    if history_text:
        full_prompt += f"Previous conversation:\n{history_text}\n"
    full_prompt += f"Student: {payload.question}"

    # Generate AI response
    try:
        ai_provider = get_ai_provider()
        answer = ai_provider.generate_text(full_prompt)
    except Exception as exc:
        logger.warning("AI provider error: %s", exc)
        answer = (
            f"**{payload.question}**\n\n"
            "The AI service is temporarily unavailable.\n\n"
            "**What to do:** Open your textbook chapter and look for this topic."
        )

    # Save AI response
    ai_msg = ConversationMessage(
        conversation_id=conv.id,
        role="ai",
        content=answer,
        page_number=payload.current_page,
        source_citations=None,
    )
    db.add(ai_msg)

    # Update conversation timestamp
    conv.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ai_msg)

    return ai_msg


def _build_system_prompt(conv: Conversation, payload: ConversationMessageIn) -> str:
    """Build a rich system prompt with chapter context."""
    parts = [
        f"You are an expert AI tutor for Class {conv.grade} {conv.subject.title()} students.",
        "You explain concepts clearly with examples.",
        "Use simple language suitable for the student's grade level.",
        "Format your answers with markdown for readability.",
        "When possible, reference page numbers from the textbook.",
    ]

    if conv.chapter_title:
        parts.append(f"\nCurrent chapter: {conv.chapter_title}")

    if payload.current_page:
        parts.append(f"Current page: {payload.current_page}")

    if payload.selected_text:
        parts.append(f'\nThe student has selected this text from their textbook:\n"{payload.selected_text}"')

    if payload.action == "explain_simply":
        parts.append("\nExplain this concept in very simple language with everyday examples.")
    elif payload.action == "generate_notes":
        parts.append("\nGenerate concise study notes with key points, formulas, and important facts.")

    return "\n".join(parts)

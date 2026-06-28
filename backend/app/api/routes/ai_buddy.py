import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import get_current_user, get_db
from app.models.models import User
from app.services.ai_buddy.intent_router import IntentRouter

router = APIRouter(prefix="/ai-buddy", tags=["AI Buddy"])

class ChatMessageRequest(BaseModel):
    message: str
    page_payload: dict = {}

@router.post("/chat/stream")
async def chat_stream(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Stream a response from AI Buddy based on user intent and context.
    """
    # Verify student role here if needed, but get_current_user gets the user
    if current_user.role.name not in ["student", "admin"]:
         raise HTTPException(status_code=403, detail="Only students can access AI Buddy")

    router_service = IntentRouter(db=db, user=current_user)

    return StreamingResponse(
        router_service.stream_response(request.message, request.page_payload),
        media_type="text/event-stream",
    )

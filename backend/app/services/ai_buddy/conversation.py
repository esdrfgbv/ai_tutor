from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.models import Conversation, ConversationMessage

class MemoryManager:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id
        # We use a dedicated module_slug for the global AI Buddy
        self.buddy_slug = "global_ai_buddy"

    def _get_or_create_conversation(self) -> Conversation:
        conv = self.db.query(Conversation).filter(
            Conversation.user_id == self.user_id,
            Conversation.module_slug == self.buddy_slug
        ).first()
        
        if not conv:
            conv = Conversation(
                user_id=self.user_id,
                subject="General",
                module_slug=self.buddy_slug,
                grade=0 # default
            )
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
        return conv

    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        conv = self._get_or_create_conversation()
        messages = self.db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == conv.id
        ).order_by(ConversationMessage.created_at.desc()).limit(limit).all()
        
        # Return in chronological order
        history = []
        for msg in reversed(messages):
            history.append({
                "role": msg.role,
                "content": msg.content
            })
        return history

    def add_message(self, role: str, content: str):
        conv = self._get_or_create_conversation()
        msg = ConversationMessage(
            conversation_id=conv.id,
            role=role,
            content=content
        )
        self.db.add(msg)
        self.db.commit()

import json
from typing import Callable, Dict, Any, List

class AIBuddyTool:
    def __init__(self, name: str, description: str, parameters: dict, func: Callable):
        self.name = name
        self.description = description
        self.parameters = parameters
        self.func = func

class ToolRegistry:
    def __init__(self):
        self.tools: Dict[str, AIBuddyTool] = {}

    def register(self, name: str, description: str, parameters: dict):
        def decorator(func: Callable):
            self.tools[name] = AIBuddyTool(name, description, parameters, func)
            return func
        return decorator

    def get_all_tools_for_llm(self) -> List[dict]:
        """
        Returns the tools in a format suitable for standard LLM function calling (OpenAI / Gemini).
        """
        tool_list = []
        for name, tool in self.tools.items():
            tool_list.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.parameters
                }
            })
        return tool_list

    async def execute_tool(self, name: str, arguments: dict, db_session, user) -> Any:
        if name not in self.tools:
            return {"error": f"Tool {name} not found"}
        
        tool = self.tools[name]
        try:
            # We inject db_session and user if the tool requires it.
            # For simplicity in this OS architecture, we assume tools take (db, user, **args)
            return await tool.func(db=db_session, user=user, **arguments)
        except Exception as e:
            return {"error": str(e)}

registry = ToolRegistry()

# =====================================================================
# PLATFORM TOOLS
# =====================================================================

@registry.register(
    name="navigate_to",
    description="Instructs the frontend to navigate to a specific page.",
    parameters={
        "type": "object",
        "properties": {
            "page": {
                "type": "string",
                "enum": ["dashboard", "analytics", "chapters", "leaderboard", "settings", "wellness", "knowledge_base"],
                "description": "The page to navigate to"
            },
            "params": {
                "type": "object",
                "description": "Optional parameters for the route (e.g. chapter_id)",
                "additionalProperties": True
            }
        },
        "required": ["page"]
    }
)
async def tool_navigate_to(db, user, page: str, params: dict = None):
    # Navigation is handled by sending a special command back to the frontend.
    # The backend just confirms the intent.
    return {"action": "navigate", "page": page, "params": params or {}}


@registry.register(
    name="get_weak_topics",
    description="Retrieves the student's weak topics based on recent analytics and quiz attempts.",
    parameters={
        "type": "object",
        "properties": {},
        "required": []
    }
)
async def tool_get_weak_topics(db, user):
    # In a real implementation, we would query the analytics_service.
    # For now, we return mock aggregated data to demonstrate the OS capability.
    return {"weak_topics": ["Fractions", "Algebraic Expressions"]}


@registry.register(
    name="open_chapter",
    description="Instructs the frontend to open a specific chapter module.",
    parameters={
        "type": "object",
        "properties": {
            "subject": {
                "type": "string",
                "description": "The subject name, e.g. Mathematics"
            },
            "chapter_number": {
                "type": "integer",
                "description": "The chapter number"
            }
        },
        "required": ["subject", "chapter_number"]
    }
)
async def tool_open_chapter(db, user, subject: str, chapter_number: int):
    # Returns an action for the frontend
    return {"action": "navigate", "page": "chapter_detail", "params": {"subject": subject, "chapter_number": chapter_number}}


@registry.register(
    name="continue_last_session",
    description="Instructs the frontend to open the last active study session.",
    parameters={
        "type": "object",
        "properties": {},
        "required": []
    }
)
async def tool_continue_last_session(db, user):
    from app.models.models import StudySession
    profile = user.student_profile
    if not profile:
        return {"error": "Student profile not found."}

    last_session = db.query(StudySession).filter(
        StudySession.student_id == profile.id
    ).order_by(StudySession.started_at.desc()).first()

    if not last_session or not last_session.chapter:
        return {"action": "message", "message": "You don't have any recent sessions to continue."}

    return {
        "action": "navigate", 
        "page": "chapter_detail", 
        "params": {"subject": last_session.subject, "chapter": last_session.chapter}
    }

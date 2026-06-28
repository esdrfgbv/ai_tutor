import json
from sqlalchemy.orm import Session
from app.models.models import User, StudentProfile, StudySession, QuizAttempt
from datetime import datetime

def get_student_context(db: Session, user: User, page_payload: dict = None) -> dict:
    """
    Aggregates all necessary context for the AI Buddy.
    """
    profile = user.student_profile
    if not profile:
        return {"error": "Student profile not found."}

    # Fetch last study session
    last_session = db.query(StudySession).filter(
        StudySession.student_id == profile.id
    ).order_by(StudySession.started_at.desc()).first()

    # Fetch recent quiz attempt for weak/strong topics
    recent_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == profile.id
    ).order_by(QuizAttempt.created_at.desc()).limit(5).all()

    recent_scores = []
    for att in recent_attempts:
        recent_scores.append({
            "quiz_id": att.quiz_id,
            "score": att.score,
            "accuracy": att.accuracy
        })

    context = {
        "student_name": user.full_name,
        "grade": profile.grade,
        "target_exam": profile.target_exam,
        "streak_days": profile.streak_days,
        "total_points": profile.total_points,
        "last_session": {
            "subject": last_session.subject if last_session else None,
            "chapter": last_session.chapter if last_session else None,
            "type": last_session.session_type if last_session else None,
        } if last_session else None,
        "recent_quiz_performance": recent_scores,
        "current_page_context": page_payload or {}
    }

    return context

def build_system_prompt(context: dict) -> str:
    """
    Builds the dynamic system prompt based on student context.
    """
    prompt = f"""You are AI Buddy, the intelligent operating system and senior teacher for the AI Tutor platform.
Your goal is to guide the student intuitively. Do NOT act like ChatGPT. Be encouraging, clear, professional, and simple.

Student Context:
- Name: {context.get('student_name', 'Student')}
- Grade: {context.get('grade', 'Unknown')}
- Current Streak: {context.get('streak_days', 0)} days
- Total Points: {context.get('total_points', 0)}
"""
    
    last_session = context.get('last_session')
    if last_session:
        prompt += f"\nLast Session: Subject: {last_session['subject']}, Chapter: {last_session['chapter']}"

    page_ctx = context.get('current_page_context')
    if page_ctx:
        prompt += f"\n\nCurrent Platform State (Where the user is right now):\n{json.dumps(page_ctx, indent=2)}"

    prompt += """

INSTRUCTIONS:
- You have access to tools to navigate the platform or perform actions.
- Do NOT hallucinate features. Use tools if the user wants to navigate, open a PDF, take a quiz, or see analytics.
- If the user asks a question about their current context (e.g. "explain this"), use the 'Current Platform State' above.
- Always be concise and helpful.
"""
    return prompt

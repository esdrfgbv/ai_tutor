import os
import sys

# Ensure backend imports work
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import StudentProfile, User, Quiz, Question, QuizAttempt
from app.services.analytics_service import AnalyticsService
from app.services.quiz_service import QuizService
from datetime import datetime

analytics_service = AnalyticsService()
quiz_service = QuizService()

def verify_analytics():
    db: Session = SessionLocal()
    
    # 1. Create a mock user & student
    user = db.query(User).filter_by(email="verify@test.com").first()
    if not user:
        user = User(email="verify@test.com", hashed_password="pw", full_name="Verify Student", role="student")
        db.add(user)
        db.commit()
        db.refresh(user)
        
    student = db.query(StudentProfile).filter_by(user_id=user.id).first()
    if not student:
        student = StudentProfile(user_id=user.id, grade=10)
        db.add(student)
        db.commit()
        db.refresh(student)

    # Clean old data for this student
    db.query(QuizAttempt).filter_by(student_id=student.id).delete()
    db.query(Question).filter(Question.quiz_id.in_(
        db.query(Quiz.id).filter_by(title="Verification Quiz")
    )).delete(synchronize_session=False)
    db.query(Quiz).filter_by(title="Verification Quiz").delete()
    db.commit()

    # 2. Create a mock quiz with 10 questions
    quiz = Quiz(title="Verification Quiz", subject="Science", grade=10, quiz_type="module")
    db.add(quiz)
    db.commit()
    db.refresh(quiz)

    questions = []
    for i in range(1, 11):
        q = Question(
            quiz_id=quiz.id, 
            prompt=f"Q{i}",
            options=["a", "b", "c", "d"],
            correct_answer="a",
            textbook_explanation="exp",
            ai_explanation="exp",
            topic="Biology" if i <= 5 else "Physics"
        )
        db.add(q)
        questions.append(q)
    db.commit()

    # SCENARIO A: 10/10 correct using "a)" formatting
    answers_a = {str(q.id): "a)" for q in questions}
    attempt_a = quiz_service.score_attempt(db, student, quiz.id, answers_a, 100)
    
    # Check Analytics
    stats = analytics_service.student_dashboard(db, student)
    assert stats.accuracy == 100, f"Scenario A: Expected 100%, got {stats.accuracy}%"
    
    # Verify Subject Performance
    sci_perf = next((s for s in stats.subject_performance if s["subject"] == "Science"), None)
    assert sci_perf["accuracy"] == 100, f"Scenario A: Subject expected 100%, got {sci_perf['accuracy']}%"

    # Verify Strong/Weak
    strong = [t["topic"] for t in stats.strong_topics]
    weak = [t["topic"] for t in stats.weak_topics]
    assert "Biology" in strong and "Physics" in strong, f"Scenario A: Strong expected Biology, Physics. Got {strong}"
    assert not weak, f"Scenario A: Expected empty Weak, got {weak}"
    
    print("PASS Scenario A Passed (100% correct)")

    # SCENARIO B: 5/10 correct
    answers_b = {str(q.id): "a)" if i < 5 else "b)" for i, q in enumerate(questions)}
    attempt_b = quiz_service.score_attempt(db, student, quiz.id, answers_b, 100)
    
    stats = analytics_service.student_dashboard(db, student)
    # Total correct = 15/20 = 75%
    assert stats.accuracy == 75, f"Scenario B: Expected 75%, got {stats.accuracy}%"
    
    print("PASS Scenario B Passed (75% cumulative correct)")

    # SCENARIO C: 0/10 correct
    answers_c = {str(q.id): "b)" for q in questions}
    attempt_c = quiz_service.score_attempt(db, student, quiz.id, answers_c, 100)
    
    stats = analytics_service.student_dashboard(db, student)
    # Total correct = 15/30 = 50%
    assert stats.accuracy == 50, f"Scenario C: Expected 50%, got {stats.accuracy}%"
    
    print("PASS Scenario C Passed (50% cumulative correct)")

    # SCENARIO D: 100% Retake
    answers_d = {str(q.id): "a)" for q in questions}
    attempt_d = quiz_service.score_attempt(db, student, quiz.id, answers_d, 100)
    
    stats = analytics_service.student_dashboard(db, student)
    # Total correct = 25/40 = 62.5% -> 62.5%
    assert stats.accuracy == 62.5, f"Scenario D: Expected 62.5%, got {stats.accuracy}%"

    print("PASS Scenario D Passed (cumulative across retakes)")
    print("PASS All analytics integrity checks passed successfully!")
    
if __name__ == "__main__":
    verify_analytics()

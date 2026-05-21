from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import Difficulty, QuestionType, Role


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class RegisterIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=180)
    password: str = Field(min_length=8)
    role: Role
    grade: int | None = Field(default=None, ge=4, le=9)
    target_exam: str | None = None
    phone: str | None = None
    student_identifier: str | None = None


class LoginIn(BaseModel):
    email: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: Role
    is_active: bool

    class Config:
        from_attributes = True


class ChapterOut(BaseModel):
    id: int
    grade: int
    subject: str
    chapter_number: int | None
    title: str
    description: str | None

    class Config:
        from_attributes = True


class DoubtRequest(BaseModel):
    question: str = Field(min_length=3)
    grade: int | None = Field(default=None, ge=4, le=9)
    subject: str | None = None
    chapter: str | None = None
    topic: str | None = None


class Citation(BaseModel):
    source: str
    page_number: int | None = None
    chapter: str | None = None
    score: float | None = None


class DoubtResponse(BaseModel):
    textbook_explanation: str
    simplified_explanation: str
    examples: list[str]
    formulas: list[str]
    related_pyqs: list[str]
    practice_tips: list[str]
    citations: list[Citation] = []
    confidence: float = 0.0


class ChapterModuleOut(BaseModel):
    chapter_number: int
    title: str
    file_path: str
    file_name: str
    slug: str
    subject: str
    grade: int
    locked: bool = False
    quiz_passed: bool = False


class MockTestOut(BaseModel):
    test_name: str
    question_count: int
    subject: str


class MockQuestionOut(BaseModel):
    id: int
    test_name: str
    prompt: str
    options: list[str]
    correct_answer: str


class TimerSyncIn(BaseModel):
    quiz_id: int
    remaining_seconds: int = Field(ge=0)


class LeaderboardRow(BaseModel):
    rank: int
    student_id: int
    name: str
    score: float
    accuracy: float
    time_taken_seconds: int
    percentile: float
    grade: int
    points: int
    streak: int


class QuizGenerateIn(BaseModel):
    grade: int = Field(ge=4, le=9)
    subject: str
    chapter: str | None = None
    topic: str | None = None
    quiz_type: str = "adaptive"
    question_count: int = Field(default=8, ge=3, le=30)
    duration_minutes: int = Field(default=20, ge=5, le=180)


class QuestionOut(BaseModel):
    id: int
    question_type: QuestionType
    prompt: str
    options: list | None
    correct_answer: str
    textbook_explanation: str
    ai_explanation: str
    difficulty: Difficulty
    topic: str | None

    class Config:
        from_attributes = True


class QuizOut(BaseModel):
    id: int
    title: str
    grade: int
    subject: str
    chapter: str | None
    quiz_type: str
    duration_minutes: int
    questions: list[QuestionOut] = []

    class Config:
        from_attributes = True


class AttemptIn(BaseModel):
    quiz_id: int
    answers: dict[str, str]
    time_taken_seconds: int = Field(default=0, ge=0)


class AttemptOut(BaseModel):
    id: int
    score: float
    accuracy: float
    time_taken_seconds: int
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    accuracy: float
    quizzes_taken: int
    study_minutes: int
    completion_rate: float
    weak_topics: list[dict]
    strong_topics: list[dict] = []
    trend: list[dict]
    recommendations: list[str]
    streak_days: int = 0
    longest_streak: int = 0
    weekly_consistency: int = 0
    active_learning_time: dict[str, int] = {}
    subject_time_distribution: list[dict] = []
    daily_progress: list[dict] = []
    subject_performance: list[dict] = []
    topic_mastery: list[dict] = []
    leaderboard_rank: int | None = None
    leaderboard_percentile: float | None = None
    study_plan: list[str] = []
    mock_test_summary: list[dict] = []
    active_days: int = 0


class ParentLinkIn(BaseModel):
    student_identifier: str = Field(..., description="Student email or registration/ID")


class ParentChildOut(BaseModel):
    link_id: int
    student_id: int
    student_name: str
    status: str


class AnnouncementIn(BaseModel):
    title: str = Field(min_length=2)
    message: str = Field(min_length=2)
    audience: str = "all"


class AnnouncementOut(AnnouncementIn):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class StudySessionStartIn(BaseModel):
    session_type: str = Field(..., pattern="^(pdf_reading|quiz|mock_test)$")
    subject: str | None = None
    chapter: str | None = None


class StudySessionOut(BaseModel):
    id: int
    student_id: int
    subject: str | None
    chapter: str | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int
    session_type: str
    active_status: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


TokenPair.model_rebuild()

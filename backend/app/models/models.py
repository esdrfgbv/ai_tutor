from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import (
    Difficulty,
    ExtractionStatus,
    LinkStatus,
    QuestionSourceType,
    QuestionType,
    Role,
    SourceType,
)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(180), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(Enum(Role), index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    refresh_token_hash: Mapped[str | None] = mapped_column(String(255))

    student_profile: Mapped["StudentProfile"] = relationship(back_populates="user", cascade="all, delete-orphan")
    parent_profile: Mapped["ParentProfile"] = relationship(back_populates="user", cascade="all, delete-orphan")


class StudentProfile(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    target_exam: Mapped[str] = mapped_column(String(80), default="JNV")
    grade: Mapped[int] = mapped_column(Integer, default=6, nullable=False)
    school_name: Mapped[str] = mapped_column(String(220), nullable=False, default="Unknown")
    school_code: Mapped[str | None] = mapped_column(String(80), unique=True)
    state: Mapped[str] = mapped_column(String(80), nullable=False, default="Unknown")
    district: Mapped[str] = mapped_column(String(80), nullable=False, default="Unknown")
    city: Mapped[str] = mapped_column(String(80), nullable=False, default="Unknown")
    section: Mapped[str] = mapped_column(String(20), nullable=False, default="A")
    medium: Mapped[str] = mapped_column(String(50), nullable=False, default="English")
    academic_year: Mapped[str] = mapped_column(String(20), nullable=False, default="2026-2027")
    normalized_school_name: Mapped[str] = mapped_column(String(220), index=True, nullable=False, default="unknown")
    normalized_state: Mapped[str] = mapped_column(String(80), index=True, nullable=False, default="unknown")
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship(back_populates="student_profile")
    links: Mapped[list["ParentChildLink"]] = relationship(back_populates="student")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="student")


class ParentProfile(Base, TimestampMixin):
    __tablename__ = "parents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32))

    user: Mapped[User] = relationship(back_populates="parent_profile")
    links: Mapped[list["ParentChildLink"]] = relationship(back_populates="parent")


class ParentChildLink(Base, TimestampMixin):
    __tablename__ = "parent_child_links"
    __table_args__ = (UniqueConstraint("parent_id", "student_id", name="uq_parent_student"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("parents.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    status: Mapped[LinkStatus] = mapped_column(Enum(LinkStatus), default=LinkStatus.pending, nullable=False)

    parent: Mapped[ParentProfile] = relationship(back_populates="links")
    student: Mapped[StudentProfile] = relationship(back_populates="links")


class Chapter(Base, TimestampMixin):
    __tablename__ = "chapters"
    __table_args__ = (Index("ix_chapter_lookup", "grade", "subject", "chapter_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    chapter_number: Mapped[int | None] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)


class PdfMetadata(Base, TimestampMixin):
    __tablename__ = "pdf_metadata"
    __table_args__ = (UniqueConstraint("file_path", name="uq_pdf_file_path"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_path: Mapped[str] = mapped_column(String(700), nullable=False)
    file_name: Mapped[str] = mapped_column(String(260), nullable=False)
    grade: Mapped[int | None] = mapped_column(Integer, index=True)
    subject: Mapped[str | None] = mapped_column(String(80), index=True)
    chapter: Mapped[str | None] = mapped_column(String(220), index=True)
    topic: Mapped[str | None] = mapped_column(String(220), index=True)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), index=True, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium, nullable=False)
    total_pages: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    chunks: Mapped[list["EmbeddingMetadata"]] = relationship(back_populates="pdf", cascade="all, delete-orphan")


class EmbeddingMetadata(Base, TimestampMixin):
    __tablename__ = "embeddings_metadata"
    __table_args__ = (Index("ix_embedding_filters", "grade", "subject", "chapter", "source_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pdf_id: Mapped[int] = mapped_column(ForeignKey("pdf_metadata.id"), nullable=False)
    vector_id: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    grade: Mapped[int | None] = mapped_column(Integer, index=True)
    subject: Mapped[str | None] = mapped_column(String(80), index=True)
    chapter: Mapped[str | None] = mapped_column(String(220), index=True)
    topic: Mapped[str | None] = mapped_column(String(220), index=True)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), index=True, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer)
    text_preview: Mapped[str] = mapped_column(Text, nullable=False)

    pdf: Mapped[PdfMetadata] = relationship(back_populates="chunks")


class Quiz(Base, TimestampMixin):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(220), index=True)
    quiz_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    is_published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    module_order: Mapped[int | None] = mapped_column(Integer)
    quiz_order: Mapped[int | None] = mapped_column(Integer)
    normalized_module_name: Mapped[str | None] = mapped_column(String(220), index=True)
    source_pdf: Mapped[str | None] = mapped_column(String(260))

    questions: Mapped[list["Question"]] = relationship(back_populates="quiz", cascade="all, delete-orphan")


class Question(Base, TimestampMixin):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), default=QuestionType.mcq, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSON)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    textbook_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    ai_explanation: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium, nullable=False)
    topic: Mapped[str | None] = mapped_column(String(220), index=True)

    quiz: Mapped[Quiz] = relationship(back_populates="questions")


class QuizAttempt(Base, TimestampMixin):
    __tablename__ = "quiz_attempts"
    __table_args__ = (Index("ix_attempt_student_quiz", "student_id", "quiz_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    student: Mapped[StudentProfile] = relationship(back_populates="attempts")
    quiz: Mapped[Quiz] = relationship()


class ProgressTracking(Base, TimestampMixin):
    __tablename__ = "progress_tracking"
    __table_args__ = (UniqueConstraint("student_id", "chapter_id", name="uq_student_chapter_progress"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id"), nullable=False)
    completion_percentage: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    time_spent_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mastery_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)


class StudentModuleProgress(Base, TimestampMixin):
    __tablename__ = "student_module_progress"
    __table_args__ = (UniqueConstraint("student_id", "grade", "subject", "chapter_number", name="uq_student_module"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    grade: Mapped[int] = mapped_column(Integer, nullable=False)
    subject: Mapped[str] = mapped_column(String(80), nullable=False)
    chapter_number: Mapped[int] = mapped_column(Integer, nullable=False)
    pdf_slug: Mapped[str] = mapped_column(String(220), nullable=False)
    quiz_passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    best_accuracy: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    unlocked: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class StudySession(Base, TimestampMixin):
    __tablename__ = "study_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False, index=True)
    subject: Mapped[str | None] = mapped_column(String(80))
    chapter: Mapped[str | None] = mapped_column(String(220))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    session_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pdf_reading, quiz, mock_test
    active_status: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_heartbeat_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class QuizTimerState(Base, TimestampMixin):
    __tablename__ = "quiz_timer_states"
    __table_args__ = (UniqueConstraint("student_id", "quiz_id", name="uq_student_quiz_timer"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    quiz_id: Mapped[int] = mapped_column(ForeignKey("quizzes.id"), nullable=False)
    remaining_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Achievement(Base, TimestampMixin):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    badge_key: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(String(260), nullable=False)


class AnalyticsEvent(Base, TimestampMixin):
    __tablename__ = "analytics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    event_type: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)


class AIConversation(Base, TimestampMixin):
    __tablename__ = "ai_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list] = mapped_column(JSON, nullable=False)
    tokens_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Announcement(Base, TimestampMixin):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    audience: Mapped[str] = mapped_column(String(80), default="all", nullable=False)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)


# ── PDF Question Bank Extraction Models ─────────────────────────────────


class QuestionBankSource(Base, TimestampMixin):
    """Tracks each imported PDF that has been processed for question extraction."""
    __tablename__ = "question_bank_sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    file_path: Mapped[str] = mapped_column(String(700), unique=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(260), nullable=False)
    display_name: Mapped[str] = mapped_column(String(260), nullable=False)
    exam_type: Mapped[str | None] = mapped_column(String(80), index=True)  # JNV, AISSEE, etc.
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    grade: Mapped[int | None] = mapped_column(Integer, index=True)
    total_pages: Mapped[int] = mapped_column(Integer, default=0)
    total_questions_extracted: Mapped[int] = mapped_column(Integer, default=0)
    extraction_status: Mapped[ExtractionStatus] = mapped_column(
        Enum(ExtractionStatus), default=ExtractionStatus.pending, nullable=False
    )
    extraction_error: Mapped[str | None] = mapped_column(Text)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)

    questions: Mapped[list["QuestionBank"]] = relationship(back_populates="source", cascade="all, delete-orphan")


class QuestionBank(Base, TimestampMixin):
    __tablename__ = "question_bank"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grade: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    chapter: Mapped[str | None] = mapped_column(String(220), index=True)
    module: Mapped[str | None] = mapped_column(String(220), index=True)
    question_type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), default=QuestionType.mcq, nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[list | None] = mapped_column(JSON)
    correct_answer: Mapped[str] = mapped_column(Text, nullable=False)
    textbook_explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.medium, nullable=False)
    marks: Mapped[int] = mapped_column(Integer, default=1)
    tags: Mapped[list | None] = mapped_column(JSON)
    source_pdf: Mapped[str | None] = mapped_column(String(260))

    # ── PDF provenance columns ──
    source_id: Mapped[int | None] = mapped_column(ForeignKey("question_bank_sources.id"), index=True)
    source_page: Mapped[int | None] = mapped_column(Integer)
    question_number: Mapped[int | None] = mapped_column(Integer)
    section_name: Mapped[str | None] = mapped_column(String(220), index=True)
    raw_text: Mapped[str | None] = mapped_column(Text)
    cleaned_text: Mapped[str | None] = mapped_column(Text)
    question_source_type: Mapped[QuestionSourceType] = mapped_column(
        Enum(QuestionSourceType), default=QuestionSourceType.manual, nullable=False
    )
    year: Mapped[int | None] = mapped_column(Integer, index=True)
    has_image: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ──
    source: Mapped[QuestionBankSource | None] = relationship(back_populates="questions")
    question_options: Mapped[list["QuestionOption"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    images: Mapped[list["QuestionImage"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    explanation: Mapped["QuestionExplanation | None"] = relationship(back_populates="question", cascade="all, delete-orphan", uselist=False)
    question_tags: Mapped[list["QuestionTag"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuestionOption(Base):
    """Normalized MCQ options — one row per option."""
    __tablename__ = "question_options"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id"), nullable=False, index=True)
    label: Mapped[str] = mapped_column(String(10), nullable=False)  # A, B, C, D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(700))

    question: Mapped[QuestionBank] = relationship(back_populates="question_options")


class QuestionImage(Base, TimestampMixin):
    """Extracted diagrams / figures associated with a question."""
    __tablename__ = "question_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id"), nullable=False, index=True)
    image_path: Mapped[str] = mapped_column(String(700), nullable=False)
    image_type: Mapped[str] = mapped_column(String(50), default="figure")  # figure, diagram, option
    page_number: Mapped[int | None] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)

    question: Mapped[QuestionBank] = relationship(back_populates="images")


class QuestionExplanation(Base, TimestampMixin):
    """Structured solution / explanation for a question."""
    __tablename__ = "question_explanations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id"), unique=True, nullable=False)
    solution_text: Mapped[str] = mapped_column(Text, nullable=False)
    solution_type: Mapped[str] = mapped_column(String(50), default="extracted")  # extracted, ai_generated
    source_page: Mapped[int | None] = mapped_column(Integer)

    question: Mapped[QuestionBank] = relationship(back_populates="explanation")


class QuestionTag(Base):
    """Flexible tagging for questions (section, topic, skill, etc.)."""
    __tablename__ = "question_tags"
    __table_args__ = (UniqueConstraint("question_id", "tag_key", "tag_value", name="uq_question_tag"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id"), nullable=False, index=True)
    tag_key: Mapped[str] = mapped_column(String(80), nullable=False, index=True)  # section, topic, skill
    tag_value: Mapped[str] = mapped_column(String(220), nullable=False)

    question: Mapped[QuestionBank] = relationship(back_populates="question_tags")


class AdminMockTest(Base, TimestampMixin):
    __tablename__ = "admin_mock_tests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(220), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    total_marks: Mapped[int] = mapped_column(Integer, nullable=False)
    negative_marking: Mapped[float] = mapped_column(Float, default=0.0)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text)
    is_scheduled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    questions: Mapped[list["AdminMockTestQuestionLink"]] = relationship(back_populates="mock_test", cascade="all, delete-orphan")
    targets: Mapped[list["AdminMockTestTarget"]] = relationship(back_populates="mock_test", cascade="all, delete-orphan")
    attempts: Mapped[list["AdminMockTestAttempt"]] = relationship(back_populates="mock_test", cascade="all, delete-orphan")


class AdminMockTestQuestionLink(Base):
    __tablename__ = "admin_mock_test_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mock_test_id: Mapped[int] = mapped_column(ForeignKey("admin_mock_tests.id"), nullable=False)
    question_bank_id: Mapped[int] = mapped_column(ForeignKey("question_bank.id"), nullable=False)
    
    mock_test: Mapped[AdminMockTest] = relationship(back_populates="questions")


class AdminMockTestTarget(Base):
    __tablename__ = "admin_mock_test_targets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mock_test_id: Mapped[int] = mapped_column(ForeignKey("admin_mock_tests.id"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(50), nullable=False)  # school, state, grade, etc.
    target_value: Mapped[str] = mapped_column(String(220), nullable=False)
    
    mock_test: Mapped[AdminMockTest] = relationship(back_populates="targets")


class AdminMockTestAttempt(Base, TimestampMixin):
    __tablename__ = "admin_mock_test_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mock_test_id: Mapped[int] = mapped_column(ForeignKey("admin_mock_tests.id"), nullable=False)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id"), nullable=False)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False)
    score: Mapped[float] = mapped_column(Float, default=0)
    accuracy: Mapped[float] = mapped_column(Float, default=0)
    time_taken_seconds: Mapped[int] = mapped_column(Integer, default=0)
    
    mock_test: Mapped[AdminMockTest] = relationship(back_populates="attempts")
    student: Mapped[StudentProfile] = relationship()


class AdminMockTestAnalytics(Base, TimestampMixin):
    __tablename__ = "admin_mock_test_analytics"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mock_test_id: Mapped[int] = mapped_column(ForeignKey("admin_mock_tests.id"), unique=True)
    participation_rate: Mapped[float] = mapped_column(Float, default=0)
    average_score: Mapped[float] = mapped_column(Float, default=0)
    school_rankings: Mapped[dict | None] = mapped_column(JSON)
    district_rankings: Mapped[dict | None] = mapped_column(JSON)

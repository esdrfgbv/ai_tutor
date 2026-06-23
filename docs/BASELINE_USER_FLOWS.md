# User Flows Report (Baseline)

Generated: 2026-06-23
Target: PrepOrbit AI Platform

---

## Student Flow

### 1. Authentication
- Landing page → `/auth`
- Register with email, password, full_name, role="student", grade, target_exam, school, state, district
- OR Login with email + password
- Receives access_token (45min), refresh_token (14 days)
- Redirected to `/student`

### 2. Dashboard
- `/student` - StudentDashboard
- Shows: accuracy, quizzes_taken, study_minutes, completion_rate
- Weak/strong topics identified
- Progress trends
- Recommendations
- Streak, points, leaderboard rank
- Study plan (weekly)
- Subject performance charts

### 3. Module Selection
- Selects grade + subject + target_exam
- `/api/learning/modules` returns available chapters
- Modules displayed with lock/unlock status
- Must pass quiz on previous module to unlock next
- Navigates to: `/chapters` or `/study/{subject}/{slug}`

### 4. Chapter Reading (Study Workspace)
- `/study/:subject/:slug` - ModuleLearningPage
- PDF displayed with resizable viewer
- Sidebar with AI tutor panel
- Text selection popup (ask AI, generate notes, explain simply)
- Chapter progress tracking
- Bookmark important sections

### 5. PDF Viewing (standalone)
- `/viewer/:subject/:slug` or `/chapters/:chapterId`
- Full PDF rendering (react-pdf/pdfjs-dist)
- Page navigation
- Text selection

### 6. AI Doubt Solving
- Three entry points:
  a. Inside study workspace (text selection → ask AI)
  b. `/doubts` - Dedicated doubt solving page
  c. `/api/learning/doubts` - RAG-based question answering
- Backend builds context-aware prompt with chapter info
- AI provider (Groq LLaMA) generates response
- Previous conversation history included in context

### 7. AI Conversations
- `/api/conversations` - threaded conversations per user+module_slug
- Single conversation per module (upsert behavior)
- Messages with role="user" or "role"="ai"
- History limited to last 10 messages for prompt context

### 8. Mock Tests
- `/quiz` or `/quizzes/mock-tests?subject=...`
- Select subject → see available mock tests organized by module
- Start quiz → timer countdown (persisted in quiz_timer_states)
- Questions with MCQ options
- Submit → score, accuracy, time taken
- Results stored in quiz_attempts

### 9. Quizzes (module-level)
- `/api/quizzes/module?chapter_number=X`
- Post QuizGenerateIn payload
- Adaptive quiz generation
- Must pass to unlock next module

### 10. Diagnostic Tests
- POST `/api/diagnostic/start` with subject
- Adaptive difficulty questions
- POST `/api/diagnostic/submit` for scoring
- Results with difficulty breakdown and recommendations
- GET `/api/diagnostic/results` for history

### 11. Leaderboard
- `/leaderboard`
- GET `/api/leaderboard`
- Rank by points/accuracy
- Filterable by grade, subject
- Shows rank, name, score, accuracy, percentile, streak

### 12. Analytics
- `/analytics`
- DashboardStats with full analytics
- Charts (Recharts) for subject performance, trends, daily progress
- Study time tracking

### 13. Additional Features
- `AIVideoPage` - Generate AI video lessons from text prompts
- `ImageAnalysisPage` - Upload images for AI analysis (visual question solving)
- `AITestEnginePage` - AI-powered test generation from PDFs
- `AdaptiveLearningPage` - Personalized learning paths
- `WellnessPage` - Study wellness/anxiety tools
- `ProfilePage` - View/edit profile
- `SettingsPage` - Account settings
- `Notes` - Save AI-generated or user-written notes
- `Bookmarks` - Save text selections from PDFs

---

## Parent Flow

### 1. Authentication
- Register with role="parent", student_identifier (child's email or student profile ID)
- Linking happens at registration time (auto-approved)
- OR Login with email + password
- Redirected to `/parent`

### 2. Dashboard
- `/parent` - ParentDashboard
- Lists linked children with their stats
- Each child shows: name, status (pending/approved/rejected)

### 3. Child Progress
- Select a child → `/api/analytics/student/{student_id}`
- View child's DashboardStats (accuracy, quizzes_taken, study_minutes, etc.)
- View weak/strong topics, trends, recommendations

### 4. Link Additional Children
- POST `/api/parents/links`
- Provide child's email or student profile ID
- Creates parent-child link (auto-approved)
- Admin can approve/reject via admin panel

---

## Admin Flow

### 1. Authentication
- Pre-seeded admin account: admin@jnvprep.local / Admin@12345
- Login with email + password
- Redirected to `/admin`

### 2. Dashboard
- `/admin` - AdminDashboard
- Platform-wide analytics
- User management (list, verify)
- Announcements management

### 3. User Management
- `/api/admin/users` - list all users
- Filter by role
- Verify/activate users
- Manage parent-child links (approve/reject)

### 4. Question Bank Management
- `/admin/questions` - AdminQuestionBankPage
- Browse/search/filter question bank
- View question details with options, source, difficulty
- Filter by subject, grade, chapter, section, year, difficulty, source

### 5. Mock Test Management
- `/admin/mock-tests` - AdminMockTestCreator
- Create scheduled mock tests
- Select questions from question bank
- Set duration, marks, negative marking
- Target specific schools/states/grades
- View test analytics

### 6. PDF Upload & Question Extraction
- `/admin/pdf-manager` - PDFUploadManager
- Upload PDF for question extraction
- Import from local directories (mock_test_papers, navodaya_pyqs, aiseee_pyqs)
- View extraction jobs, stats
- Reprocess failed jobs

### 7. Knowledge Base Management
- `/admin/knowledge-base` - KnowledgeBasePage (937 lines)
- Upload documents (PDF, DOCX, images, TXT)
- View document list with filters (status, source_type, class, subject, exam_type)
- View document details with chunks, tables, images, versions
- Manage metadata registry (class, subject, chapter, exam_type, etc.)
- View processing queue
- Search across all knowledge base content
- View knowledge base analytics
- Rollback document versions
- Trigger legacy data migration
- View health status of KB subsystems

### 8. Analytics & Stakeholder Reports
- `/api/analytics/admin` - Full platform analytics
- `/api/analytics/admin/stakeholder` - Stakeholder-specific analytics
- `/admin/leaderboard` - Admin leaderboard with group-by (district, state, school)
- `/api/leaderboard/admin/grouped` - Grouped leaderboard
- Drill-down by grade, state, district, school, medium, section

### 9. Content Management
- Upload PDF textbooks to `/api/admin/upload-pdf`
- Manual file management via API
- Announcement creation

---

## OCR Flow

### Document Upload (Knowledge Base)
1. Admin uploads file (PDF/DOCX/image/TXT) via POST `/api/admin/knowledge/upload`
2. File saved to knowledge_upload_dir
3. Processing job created with status=queued
4. Background pipeline orchestrator picks up job
5. Stages: validating → extracting → parsing_layout → extracting_tables → extracting_images → chunking → deduplicating → embedding → completed
6. For PDFs: PyMuPDF extracts text, pdfplumber extracts tables
7. For images: PaddleOCR extracts text
8. Gemini Vision API classifies and describes images
9. Chunks stored in knowledge_chunks
10. Embeddings generated and stored in ChromaDB via vector_service
11. Canonical questions deduplicated (SimHash)
12. Full audit trail in ingestion_audit_logs

### Question Extraction (PYQs)
1. Admin uploads PDF or imports from local directory
2. POST `/api/admin/pdf-extraction/upload` or `/import-local`
3. Background question_extraction_pipeline processes PDF
4. Extracts MCQ questions with options
5. Normalizes and validates
6. Deduplicates (datasketch/SimHash)
7. Stores in question_bank with source reference

---

## RAG Flow

1. User submits doubt via POST `/api/learning/doubts` or conversation message
2. rag_service.answer_doubt or send_message called
3. Vector search performed via vector_service.query() against ChromaDB
   - Uses sentence-transformers/all-MiniLM-L6-v2 for embeddings
   - Filters by grade, subject, chapter if available
4. Retrieved chunks (top 3-5 by default) used as context
5. AI provider (Groq LLaMA) generates response with context
6. Response includes answer text + optional source citations
7. Conversation saved to database

---

## AI Chat Flow

1. Study workspace: user selects text or types question
2. POST /api/conversations/{conv_id}/messages with {question, selected_text, current_page, action}
3. Backend _build_system_prompt creates context:
   - Grade, subject, chapter info
   - Selected text (if any)
   - Page number
   - Action modifier ("explain_simply", "generate_notes")
4. Last 10 messages of conversation history included
5. AI provider generates response
6. Response saved as ConversationMessage with role="ai"
7. Conversation updated_at refreshed
8. Response returned to frontend

---

## Mock Test Flow

1. Student selects subject → GET /api/quizzes/mock-tests?subject=X
2. Available tests displayed organized by module
3. Student starts test → GET /api/quizzes/{quiz_id}
4. Quiz loaded with questions
5. Timer starts, synced via POST /api/quizzes/timer/sync
6. Student answers questions
7. Submit → POST /api/quizzes/attempts
8. Backend scores, stores quiz_attempt
9. Result returned: score, accuracy, time_taken

---

## Leaderboard Flow

1. GET /api/leaderboard with optional filters
2. leaderboard_service.build() queries quiz_attempts
3. Calculates: rank, score, accuracy, percentile, points
4. Groups by student, aggregates best scores
5. Admin can view grouped by district/state/school
6. Admin leaderboard has extended fields (school, state, district, city, section, medium)

---

## Analytics Flow

1. GET /api/analytics/student
2. analytics_service.student_dashboard() aggregates:
   - Quiz accuracy (avg)
   - Quizzes taken (count)
   - Study minutes (from study_sessions)
   - Completion rate (from progress_tracking)
   - Weak/strong topics (from quiz_attempts)
   - Trend (daily accuracy over time)
   - Streaks (from students table)
   - Subject performance
   - Topic mastery
   - Leaderboard rank
   - Recommendations (AI-generated or rule-based)

---

## Module Unlocking Logic

1. Each student has student_module_progress per (grade, subject, chapter_number)
2. On module load: check if quiz_passed=True for previous chapter
3. If previous chapter quiz not passed → locked=True
4. When student completes quiz with passing accuracy → quiz_passed=True
5. This unlocks next module
6. First module always unlocked=True by default

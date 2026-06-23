# API Contract Report (Baseline)

Generated: 2026-06-23
Target: PrepOrbit AI Backend

---

## POST /api/auth/register

- **Status codes**: 201 Created, 409 Conflict, 422 Validation
- **Request body**:
```json
{
  "email": "EmailStr",
  "full_name": "str (2-180 chars)",
  "password": "str (min 8 chars)",
  "role": "student | parent | admin",
  "grade": "int (4-9, optional)",
  "target_exam": "str (optional)",
  "phone": "str (optional)",
  "student_identifier": "str (optional, for parent registration)",
  "school_name": "str (optional)",
  "state": "str (optional)",
  "district": "str (optional)",
  "city": "str (optional)",
  "section": "str (optional)",
  "medium": "str (optional)",
  "academic_year": "str (optional)"
}
```
- **Response body** (201):
```json
{
  "access_token": "str",
  "refresh_token": "str",
  "token_type": "bearer",
  "user": {
    "id": "int",
    "email": "str",
    "full_name": "str",
    "role": "student | parent | admin",
    "is_active": true,
    "student_profile": { ... } | null
  }
}
```

---

## POST /api/auth/login

- **Status codes**: 200 OK, 401 Unauthorized, 403 Forbidden
- **Request body**:
```json
{
  "email": "str",
  "password": "str"
}
```
- **Response body** (200): Same TokenPair as register.

---

## POST /api/auth/refresh

- **Status codes**: 200 OK, 401 Unauthorized
- **Request body**:
```json
{
  "refresh_token": "str"
}
```
- **Response body** (200): Same TokenPair.

---

## POST /api/auth/forgot-password

- **Status codes**: 200 OK, 404 Not Found
- **Request body**:
```json
{
  "email": "str"
}
```
- **Response body** (200):
```json
{
  "message": "Password reset successful",
  "new_password": "str"
}
```

---

## GET /api/learning/subjects

- **Query params**: grade (int, optional), target_exam (str, default "JNV")
- **Response**: `["maths", "science", ...]`

---

## GET /api/learning/modules

- **Query params**: grade (int, required), subject (str, required), target_exam (str, default "JNV")
- **Response**: Array of module objects with chapter_number, title, file_path, file_name, slug, subject, grade, locked, quiz_passed

---

## GET /api/learning/chapters

- **Query params**: grade (int, optional), subject (str, optional)
- **Response**: `[{"id": int, "grade": int, "subject": str, "chapter_number": int|null, "title": str, "description": str|null}]`

---

## GET /api/learning/chapters/{chapter_id}

- **Status codes**: 200 OK, 404 Not Found
- **Response**: Single ChapterOut

---

## GET /api/learning/class-{grade}/{subject}/pdf/{pdf_slug}

- **Query params**: target_exam (str, default "JNV")
- **Response**: Raw PDF binary (application/pdf)
- **Status codes**: 200 OK, 400 Bad Request, 404 Not Found

---

## POST /api/learning/doubts

- **Request body**:
```json
{
  "question": "str (min 3 chars)",
  "grade": "int (4-9, optional)",
  "subject": "str (optional)",
  "chapter": "str (optional)",
  "slug": "str (optional)"
}
```
- **Response**: `{"answer": "str", "source": "str|null"}`

---

## POST /api/learning/progress/{chapter_id}

- **Query params**: completion (float), minutes (int, default 0)
- **Response**: `{"status": "updated"}`

---

## GET /api/learning/profile

- **Response**: `{"id": int, "grade": int, "target_exam": str}`

---

## GET /api/quizzes

- **Query params**: grade (int, optional), subject (str, optional)
- **Response**: Array of QuizOut objects with questions nested

---

## GET /api/quizzes/{quiz_id}

- **Status codes**: 200 OK, 404 Not Found
- **Response**: Full QuizOut with questions

---

## GET /api/quizzes/subjects

- **Response**: Array of subject strings

---

## GET /api/quizzes/subjects/{subject}/modules

- **Response**: Array of ModuleOut objects with module_name, module_order, quizzes

---

## GET /api/quizzes/mock-tests

- **Query params**: subject (str, required)
- **Response**: Array of mock test objects

---

## POST /api/quizzes/module

- **Query params**: chapter_number (int, required)
- **Request body**: QuizGenerateIn
- **Response**: QuizOut

---

## POST /api/quizzes/mock

- **Query params**: test_name (str, required)
- **Request body**: QuizGenerateIn
- **Response**: QuizOut

---

## POST /api/quizzes/attempts

- **Request body**:
```json
{
  "quiz_id": int,
  "answers": {"question_id": "selected_answer", ...},
  "time_taken_seconds": int
}
```
- **Response**: `{"id": int, "score": float, "accuracy": float, "time_taken_seconds": int, "created_at": datetime}`

---

## POST /api/quizzes/timer/sync

- **Request body**: `{"quiz_id": int, "remaining_seconds": int}`
- **Response**: `{"status": "ok", "remaining_seconds": int}`

---

## GET /api/quizzes/timer/{quiz_id}

- **Response**: `{"remaining_seconds": int}`

---

## GET /api/analytics/student

- **Response**: Full DashboardStats object (accuracy, quizzes_taken, study_minutes, completion_rate, weak_topics, strong_topics, trend, recommendations, streak data, etc.)

---

## GET /api/analytics/student/{student_id}

- **Status codes**: 200 OK, 404 Not Found
- **Response**: Same DashboardStats (parent/admin access)

---

## GET /api/analytics/admin

- **Response**: Admin dashboard overview (full analytics)

---

## GET /api/analytics/admin/stakeholder

- **Response**: Stakeholder analytics

---

## GET /api/leaderboard

- **Query params**: grade (int, optional), subject (str, optional), limit (int, default 50)
- **Response**: Array of LeaderboardRow objects (rank, student_id, name, score, accuracy, time_taken_seconds, percentile, grade, points, streak)

---

## GET /api/leaderboard/admin

- **Query params**: page (int, default 1), limit (int, default 50), grade, subject, school_name, state, district, city, medium, section, sort_by
- **Response**: `{"total_count": int, "page": int, "limit": int, "data": [AdminLeaderboardRow]}`

---

## GET /api/leaderboard/admin/grouped

- **Query params**: group_by (district|state|school), page, limit, grade, state
- **Response**: `{"group_by": str, "total_count": int, "page": int, "limit": int, "data": [GroupedLeaderboardRow]}`

---

## POST /api/parents/links

- **Request body**: `{"student_identifier": "str"}`
- **Response**: `{"link_id": int, "student_id": int, "student_name": str, "status": str}`

---

## GET /api/parents/children

- **Response**: Array of ParentChildOut

---

## GET /api/admin/users

- **Query params**: role (optional)
- **Response**: Array of `{id, email, full_name, role, active}`

---

## POST /api/admin/parent-links/{link_id}/approve

- **Status codes**: 200 OK, 404 Not Found
- **Response**: `{"status": "approved"}`

---

## GET /api/admin/parent-links

- **Query params**: status (optional)
- **Response**: Array of parent link objects

---

## POST /api/admin/upload-pdf

- **Body**: multipart/form-data with file
- **Response**: `{"file_path": str, "message": str}`

---

## POST /api/admin/users/{user_id}/verify

- **Query params**: active (bool, default true)
- **Response**: `{"id": int, "active": bool}`

---

## POST /api/admin/announcements

- **Request body**: `{"title": str, "message": str, "audience": str}`
- **Response**: Full AnnouncementOut

---

## GET /api/admin/knowledge/documents

- **Query params**: page, limit, status, source_type, doc_class, subject, exam_type, search
- **Response**: `{"total_count": int, "page": int, "limit": int, "data": [KnowledgeDocumentOut]}`

---

## POST /api/admin/knowledge/upload

- **Body**: multipart/form-data with file + metadata_json
- **Response**: Full KnowledgeDocumentOut

---

## GET /api/admin/knowledge/documents/{doc_id}

- **Response**: Full KnowledgeDocumentDetailOut with audit_logs, chunk counts, table/image counts

---

## GET /api/admin/knowledge/documents/{doc_id}/chunks

- **Query params**: page, limit
- **Response**: Array of KnowledgeChunkOut

---

## GET /api/admin/knowledge/documents/{doc_id}/tables

- **Response**: Array of KnowledgeTableOut

---

## GET /api/admin/knowledge/documents/{doc_id}/images

- **Response**: Array of KnowledgeImageOut

---

## GET /api/admin/knowledge/documents/{doc_id}/versions

- **Response**: Array of DocumentVersionOut

---

## GET /api/admin/knowledge/queue

- **Query params**: status, page, limit
- **Response**: Array of ProcessingJobOut

---

## GET /api/admin/knowledge/metadata/schema

- **Response**: `{"fields": {...}}`

---

## GET /api/admin/knowledge/metadata/{field_name}

- **Query params**: parent_field, parent_value
- **Response**: Array of MetadataValueOut

---

## POST /api/admin/knowledge/metadata/{field_name}

- **Request body**: MetadataValueIn
- **Response**: MetadataValueOut

---

## PUT /api/admin/knowledge/metadata/{field_name}/{entry_id}

- **Request body**: MetadataValueUpdateIn
- **Response**: `{"message": "Updated", "id": int}`

---

## DELETE /api/admin/knowledge/metadata/{field_name}/{entry_id}

- **Response**: `{"message": "Deactivated"}`

---

## GET /api/admin/knowledge/analytics

- **Response**: Full KnowledgeAnalyticsOut

---

## GET /api/admin/knowledge/search

- **Query params**: query, doc_class, subject, chapter, exam_type, limit
- **Response**: `{"results": [...], "total": int}`

---

## GET /api/admin/knowledge/health

- **Response**: `{"database": str, "vector_store": {...}, "collections": [...]}`

---

## POST /api/admin/mock-tests

- **Request body**: MockTestCreateIn (title, description, duration_minutes, total_marks, negative_marking, start_time, end_time, instructions, is_scheduled, question_ids, targets)
- **Response**: `{"id": int, "message": str}`

---

## GET /api/admin/mock-tests

- **Response**: Array of mock test summaries with question_count, targets

---

## GET /api/admin/questions

- **Query params**: page, limit, subject, grade, chapter, section, source_pdf, source_id, year, difficulty, question_type, search, has_image
- **Response**: `{"total_count": int, "page": int, "limit": int, "data": [QuestionBankItemOut]}`

---

## GET /api/admin/questions/{question_id}

- **Response**: Full QuestionBankItemOut

---

## GET /api/admin/questions/sources

- **Response**: Array of SourceFilterOut

---

## GET /api/admin/questions/sections

- **Response**: Array of SectionFilterOut

---

## GET /api/admin/questions/years

- **Response**: Array of YearFilterOut

---

## POST /api/admin/questions/random-set

- **Request body**: RandomTestGenerateIn
- **Response**: QuizOut

---

## POST /api/admin/pdf-extraction/upload

- **Body**: multipart/form-data
- **Response**: ExtractionJobOut

---

## POST /api/admin/pdf-extraction/import-local

- **Request body**: LocalImportIn
- **Response**: `{"message": str}`

---

## GET /api/admin/pdf-extraction/jobs

- **Response**: Array of ExtractionJobOut

---

## GET /api/admin/pdf-extraction/jobs/{source_id}

- **Response**: ExtractionJobOut

---

## POST /api/admin/pdf-extraction/jobs/{source_id}/reprocess

- **Response**: `{"message": str}`

---

## GET /api/admin/pdf-extraction/stats

- **Response**: Full ExtractionStatsOut

---

## POST /api/conversations

- **Request body**: `{"subject": str, "module_slug": str, "chapter_title": str|null, "grade": int}`
- **Response**: ConversationOut (existing or new)

---

## GET /api/conversations

- **Query params**: subject (optional)
- **Response**: Array of ConversationListItem (with last_message, message_count)

---

## GET /api/conversations/recent

- **Query params**: module_slug, limit (int, default 10)
- **Response**: Array of RecentDoubtOut

---

## GET /api/conversations/{conversation_id}

- **Response**: Full ConversationOut with messages

---

## POST /api/conversations/{conversation_id}/messages

- **Request body**: `{"question": str, "selected_text": str|null, "current_page": int|null, "action": str|null}`
- **Response**: ConversationMessageOut (the AI response)

---

## POST /api/diagnostic/start

- **Request body**: `{"subject": "math|english|science|reasoning"}`
- **Response**: DiagnosticStartOut with quiz_id, title, subject, grade, duration_minutes, questions

---

## POST /api/diagnostic/submit

- **Request body**: `{"quiz_id": int, "answers": dict, "time_taken_seconds": int}`
- **Response**: DiagnosticSubmitOut with score breakdown, recommendations

---

## GET /api/diagnostic/results

- **Query params**: limit (int, default 10, max 50)
- **Response**: Array of DiagnosticHistoryItem

---

## POST /api/notes

- **Request body**: StudyNoteIn
- **Response**: StudyNoteOut

---

## GET /api/notes

- **Query params**: module_slug, subject
- **Response**: Array of StudyNoteOut

---

## DELETE /api/notes/{note_id}

- **Response**: `{"status": "deleted"}`

---

## POST /api/bookmarks

- **Request body**: StudyBookmarkIn
- **Response**: StudyBookmarkOut

---

## GET /api/bookmarks

- **Query params**: module_slug, subject
- **Response**: Array of StudyBookmarkOut (limited to 100)

---

## DELETE /api/bookmarks/{bookmark_id}

- **Response**: `{"status": "deleted"}`

---

## POST /api/study-sessions/start

- **Request body**: `{"session_type": "pdf_reading|quiz|mock_test", "subject": str|null, "chapter": str|null}`
- **Response**: StudySessionOut

---

## POST /api/study-sessions/{session_id}/heartbeat

- **Response**: StudySessionOut

---

## POST /api/study-sessions/{session_id}/end

- **Response**: StudySessionOut

---

## GET /api/study-plan

- **Response**: `{"plan": dict|null, "week_start": str, "week_end": str, "generated_by": str}`

---

## POST /api/study-plan/generate

- **Response**: Same as GET

---

## GET /api/study-plan/history

- **Response**: `{"history": [...]}`

---

## GET /api/health

- **Response**: `{"status": "ok|degraded", "service": str, "database": "connected|disconnected"}`

# Database Schema Report (Baseline)

Generated: 2026-06-23
Target: PrepOrbit AI (MySQL 8.4 / SQLAlchemy ORM)

---

## Table: users
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| email | String(255) | UNIQUE, INDEX, NOT NULL |
| full_name | String(180) | NOT NULL |
| hashed_password | String(255) | NOT NULL |
| role | Enum(Role) | INDEX, NOT NULL |
| is_active | Boolean | default=True, NOT NULL |
| refresh_token_hash | String(255) | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: student_profile (1:1), parent_profile (1:1)

---

## Table: students
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, UNIQUE, NOT NULL |
| target_exam | String(80) | default="JNV" |
| grade | Integer | NOT NULL, default=6 |
| school_name | String(220) | NOT NULL, default="Unknown" |
| school_code | String(80) | UNIQUE, nullable |
| state | String(80) | NOT NULL, default="Unknown" |
| district | String(80) | NOT NULL, default="Unknown" |
| city | String(80) | NOT NULL, default="Unknown" |
| section | String(20) | NOT NULL, default="A" |
| medium | String(50) | NOT NULL, default="English" |
| academic_year | String(20) | NOT NULL, default="2026-2027" |
| normalized_school_name | String(220) | INDEX, NOT NULL, default="unknown" |
| normalized_state | String(80) | INDEX, NOT NULL, default="unknown" |
| streak_days | Integer | NOT NULL, default=0 |
| longest_streak | Integer | NOT NULL, default=0 |
| total_points | Integer | NOT NULL, default=0 |
| onboarding_completed | Boolean | NOT NULL, default=False |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: user, links→parent_child_links, attempts→quiz_attempts

---

## Table: parents
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, UNIQUE, NOT NULL |
| phone | String(32) | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: user, links→parent_child_links

---

## Table: parent_child_links
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| parent_id | Integer | FK→parents.id, NOT NULL |
| student_id | Integer | FK→students.id, NOT NULL |
| status | Enum(LinkStatus) | default=pending, NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Constraints: UNIQUE(parent_id, student_id) - "uq_parent_student"

---

## Table: chapters
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| grade | Integer | INDEX, NOT NULL |
| subject | String(80) | INDEX, NOT NULL |
| chapter_number | Integer | nullable |
| title | String(220) | NOT NULL |
| description | Text | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Index: ix_chapter_lookup (grade, subject, chapter_number) - composite INDEX

---

## Table: pdf_metadata
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| file_path | String(700) | UNIQUE, NOT NULL |
| file_name | String(260) | NOT NULL |
| grade | Integer | INDEX, nullable |
| subject | String(80) | INDEX, nullable |
| chapter | String(220) | INDEX, nullable |
| topic | String(220) | INDEX, nullable |
| source_type | Enum(SourceType) | INDEX, NOT NULL |
| year | Integer | INDEX, nullable |
| difficulty | Enum(Difficulty) | default=medium, NOT NULL |
| total_pages | Integer | NOT NULL, default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: chunks→embeddings_metadata

---

## Table: embeddings_metadata
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| pdf_id | Integer | FK→pdf_metadata.id, NOT NULL |
| vector_id | String(160) | UNIQUE, INDEX, NOT NULL |
| grade | Integer | INDEX, nullable |
| subject | String(80) | INDEX, nullable |
| chapter | String(220) | INDEX, nullable |
| topic | String(220) | INDEX, nullable |
| source_type | Enum(SourceType) | INDEX, NOT NULL |
| year | Integer | INDEX, nullable |
| difficulty | Enum(Difficulty) | default=medium, NOT NULL |
| page_number | Integer | nullable |
| text_preview | Text | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Index: ix_embedding_filters (grade, subject, chapter, source_type) - composite INDEX

---

## Table: quizzes
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| title | String(220) | NOT NULL |
| grade | Integer | INDEX, NOT NULL |
| subject | String(80) | INDEX, NOT NULL |
| chapter | String(220) | INDEX, nullable |
| quiz_type | String(80) | INDEX, NOT NULL |
| duration_minutes | Integer | NOT NULL, default=20 |
| created_by_id | Integer | FK→users.id, nullable |
| is_published | Boolean | default=True, NOT NULL |
| scheduled_date | DateTime | nullable |
| total_marks | Integer | nullable |
| negative_marking | Float | default=0.0 |
| module_order | Integer | nullable |
| quiz_order | Integer | nullable |
| normalized_module_name | String(220) | INDEX, nullable |
| source_pdf | String(260) | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: questions→questions (1:M)

---

## Table: questions
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| quiz_id | Integer | FK→quizzes.id, NOT NULL |
| question_type | Enum(QuestionType) | default=mcq, NOT NULL |
| prompt | Text | NOT NULL |
| options | JSON | nullable |
| correct_answer | Text | NOT NULL |
| textbook_explanation | Text | NOT NULL |
| ai_explanation | Text | NOT NULL |
| difficulty | Enum(Difficulty) | default=medium, NOT NULL |
| topic | String(220) | INDEX, nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: quiz→quizzes

---

## Table: quiz_attempts
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, NOT NULL |
| quiz_id | Integer | FK→quizzes.id, NOT NULL |
| answers | JSON | NOT NULL |
| score | Float | NOT NULL, default=0 |
| accuracy | Float | NOT NULL, default=0 |
| time_taken_seconds | Integer | NOT NULL, default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Index: ix_attempt_student_quiz (student_id, quiz_id) - composite INDEX

---

## Table: progress_tracking
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, NOT NULL |
| chapter_id | Integer | FK→chapters.id, NOT NULL |
| completion_percentage | Float | NOT NULL, default=0 |
| time_spent_minutes | Integer | NOT NULL, default=0 |
| mastery_score | Float | NOT NULL, default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Constraints: UNIQUE(student_id, chapter_id) - "uq_student_chapter_progress"

---

## Table: student_module_progress
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, INDEX, NOT NULL |
| grade | Integer | NOT NULL |
| subject | String(80) | NOT NULL |
| chapter_number | Integer | NOT NULL |
| pdf_slug | String(220) | NOT NULL |
| quiz_passed | Boolean | default=False, NOT NULL |
| best_accuracy | Float | default=0, NOT NULL |
| unlocked | Boolean | default=True, NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Constraints: UNIQUE(student_id, grade, subject, chapter_number) - "uq_student_module"

---

## Table: study_sessions
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, INDEX, NOT NULL |
| subject | String(80) | nullable |
| chapter | String(220) | nullable |
| started_at | DateTime | NOT NULL |
| ended_at | DateTime | nullable |
| duration_seconds | Integer | NOT NULL, default=0 |
| session_type | String(50) | NOT NULL (pdf_reading, quiz, mock_test) |
| active_status | Boolean | NOT NULL, default=True |
| last_heartbeat_at | DateTime | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: quiz_timer_states
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, NOT NULL |
| quiz_id | Integer | FK→quizzes.id, NOT NULL |
| remaining_seconds | Integer | NOT NULL, default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Constraints: UNIQUE(student_id, quiz_id) - "uq_student_quiz_timer"

---

## Table: achievements
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, NOT NULL |
| badge_key | String(80) | NOT NULL |
| title | String(160) | NOT NULL |
| description | String(260) | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: analytics (AnalyticsEvent)
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, nullable |
| event_type | String(100) | INDEX, NOT NULL |
| payload | JSON | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: ai_conversations
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, NOT NULL |
| question | Text | NOT NULL |
| answer | Text | NOT NULL |
| citations | JSON | NOT NULL |
| tokens_used | Integer | NOT NULL, default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: notifications
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, NOT NULL |
| title | String(180) | NOT NULL |
| message | Text | NOT NULL |
| is_read | Boolean | NOT NULL, default=False |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: announcements
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| title | String(180) | NOT NULL |
| message | Text | NOT NULL |
| audience | String(80) | default="all", NOT NULL |
| created_by_id | Integer | FK→users.id, NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: question_bank_sources
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| file_path | String(700) | UNIQUE, NOT NULL |
| file_name | String(260) | NOT NULL |
| display_name | String(260) | NOT NULL |
| exam_type | String(80) | INDEX, nullable |
| year | Integer | INDEX, nullable |
| grade | Integer | INDEX, nullable |
| total_pages | Integer | NOT NULL, default=0 |
| total_questions_extracted | Integer | NOT NULL, default=0 |
| extraction_status | Enum(ExtractionStatus) | NOT NULL, default=pending |
| extraction_error | Text | nullable |
| processed_at | DateTime | nullable |
| document_hash | String(64) | INDEX, nullable |
| classification_metadata | JSON | nullable |
| ocr_report | JSON | nullable |
| extraction_report | JSON | nullable |
| database_report | JSON | nullable |
| generated_markdown_path | String(700) | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: questions→question_bank (1:M)

---

## Table: question_bank
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| grade | Integer | INDEX, NOT NULL |
| subject | String(80) | INDEX, NOT NULL |
| chapter | String(220) | INDEX, nullable |
| module | String(220) | INDEX, nullable |
| question_type | Enum(QuestionType) | default=mcq, NOT NULL |
| prompt | Text | NOT NULL |
| options | JSON | nullable |
| correct_answer | Text | NOT NULL |
| textbook_explanation | Text | NOT NULL, default="" |
| difficulty | Enum(Difficulty) | default=medium, NOT NULL |
| marks | Integer | default=1 |
| tags | JSON | nullable |
| source_pdf | String(260) | nullable |
| source_id | Integer | FK→question_bank_sources.id, INDEX, nullable |
| source_page | Integer | nullable |
| question_number | Integer | nullable |
| section_name | String(220) | INDEX, nullable |
| raw_text | Text | nullable |
| cleaned_text | Text | nullable |
| question_source_type | Enum(QuestionSourceType) | default=manual, NOT NULL |
| year | Integer | INDEX, nullable |
| has_image | Boolean | default=False, NOT NULL |
| question_hash | String(64) | UNIQUE, INDEX, nullable |
| table_data | JSON | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: source→question_bank_sources, question_options→question_options (1:M), images→question_images (1:M), explanation→question_explanations (1:1), question_tags→question_tags (1:M)

---

## Table: question_options
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| question_id | Integer | FK→question_bank.id, INDEX, NOT NULL |
| label | String(10) | NOT NULL (A, B, C, D) |
| text | Text | NOT NULL |
| is_correct | Boolean | NOT NULL, default=False |
| image_path | String(700) | nullable |

---

## Table: question_images
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| question_id | Integer | FK→question_bank.id, INDEX, NOT NULL |
| image_path | String(700) | NOT NULL |
| image_type | String(50) | default="figure" |
| page_number | Integer | nullable |
| width | Integer | nullable |
| height | Integer | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: question_explanations
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| question_id | Integer | FK→question_bank.id, UNIQUE, NOT NULL |
| solution_text | Text | NOT NULL |
| solution_type | String(50) | default="extracted" |
| source_page | Integer | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: question_tags
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| question_id | Integer | FK→question_bank.id, INDEX, NOT NULL |
| tag_key | String(80) | INDEX, NOT NULL |
| tag_value | String(220) | NOT NULL |

Constraints: UNIQUE(question_id, tag_key, tag_value) - "uq_question_tag"

---

## Table: admin_mock_tests
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| title | String(220) | NOT NULL |
| description | Text | nullable |
| duration_minutes | Integer | NOT NULL |
| total_marks | Integer | NOT NULL |
| negative_marking | Float | default=0.0 |
| start_time | DateTime | NOT NULL |
| end_time | DateTime | NOT NULL |
| instructions | Text | nullable |
| is_scheduled | Boolean | default=True |
| created_by_id | Integer | FK→users.id |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Relationships: questions→admin_mock_test_questions, targets→admin_mock_test_targets, attempts→admin_mock_test_attempts

---

## Table: admin_mock_test_questions
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| mock_test_id | Integer | FK→admin_mock_tests.id, NOT NULL |
| question_bank_id | Integer | FK→question_bank.id, NOT NULL |

---

## Table: admin_mock_test_targets
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| mock_test_id | Integer | FK→admin_mock_tests.id, NOT NULL |
| target_type | String(50) | NOT NULL |
| target_value | String(220) | NOT NULL |

---

## Table: admin_mock_test_attempts
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| mock_test_id | Integer | FK→admin_mock_tests.id, NOT NULL |
| student_id | Integer | FK→students.id, NOT NULL |
| answers | JSON | NOT NULL |
| score | Float | default=0 |
| accuracy | Float | default=0 |
| time_taken_seconds | Integer | default=0 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: admin_mock_test_analytics
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| mock_test_id | Integer | FK→admin_mock_tests.id, UNIQUE |
| participation_rate | Float | default=0 |
| average_score | Float | default=0 |
| school_rankings | JSON | nullable |
| district_rankings | JSON | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: conversations
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, NOT NULL |
| subject | String(80) | NOT NULL |
| module_slug | String(220) | NOT NULL |
| chapter_title | String(220) | nullable |
| grade | Integer | NOT NULL |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Constraints: UNIQUE(user_id, module_slug) - "uq_user_module_conv"
Index: ix_conv_user (user_id) - INDEX

---

## Table: conversation_messages
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| conversation_id | Integer | FK→conversations.id, INDEX, NOT NULL |
| role | String(20) | NOT NULL ("user"|"ai") |
| content | Text | NOT NULL |
| selected_text | Text | nullable |
| page_number | Integer | nullable |
| source_citations | JSON | nullable |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: study_notes
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, INDEX, NOT NULL |
| module_slug | String(220) | INDEX, NOT NULL |
| subject | String(80) | NOT NULL |
| chapter_title | String(220) | nullable |
| content | Text | NOT NULL |
| selected_text | Text | nullable |
| source_page | Integer | nullable |
| grade | Integer | NOT NULL, default=9 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Table: study_plans
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| student_id | Integer | FK→students.id, NOT NULL |
| week_start | DateTime | NOT NULL |
| week_end | DateTime | NOT NULL |
| plan_data | JSON | NOT NULL |
| is_active | Boolean | NOT NULL, default=True |
| generated_by | String(20) | NOT NULL, default="rule" |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

Index: ix_study_plan_student_active (student_id, is_active) - composite INDEX

---

## Table: study_bookmarks
| Column | Type | Constraints |
|--------|------|-------------|
| id | Integer | PK, auto-increment |
| user_id | Integer | FK→users.id, INDEX, NOT NULL |
| module_slug | String(220) | INDEX, NOT NULL |
| subject | String(80) | NOT NULL |
| chapter_title | String(220) | nullable |
| selected_text | Text | NOT NULL |
| page_number | Integer | nullable |
| grade | Integer | NOT NULL, default=9 |
| created_at | DateTime | NOT NULL |
| updated_at | DateTime | NOT NULL |

---

## Knowledge Base Tables

### knowledge_documents
| Index | Columns |
|-------|---------|
| ix_kd_status | processing_status |
| ix_kd_source_type | source_type |
| ix_kd_metadata_lookup | doc_class, doc_subject, doc_chapter (composite) |
| uq_knowledge_doc_hash | file_hash (UNIQUE) |

### knowledge_chunks
| Index | Columns |
|-------|---------|
| ix_kc_doc | document_id |
| ix_kc_type | chunk_type |
| uq_chunk_hash_doc | chunk_hash, document_id (UNIQUE composite) |

### knowledge_embeddings
| Index | Columns |
|-------|---------|
| uq_ke_vector_id | vector_id (UNIQUE) |
| uq_ke_chunk_id | chunk_id (UNIQUE) |

### canonical_questions
| Index | Columns |
|-------|---------|
| ix_cq_subject | subject |
| ix_cq_chapter | chapter |
| ix_cq_difficulty | difficulty |
| uq_canonical_hash | canonical_hash (UNIQUE) |

### metadata_registry
| Index | Columns |
|-------|---------|
| ix_mr_field | field_name |
| ix_mr_parent | parent_field, parent_value (composite) |
| uq_metadata_field_value | field_name, field_value (UNIQUE composite) |

### ingestion_audit_logs
| Index | Columns |
|-------|---------|
| ix_ial_doc | document_id |
| ix_ial_action | action |

### processing_jobs
| Index | Columns |
|-------|---------|
| ix_pj_status_priority | status, priority (composite) |
| ix_pj_doc | document_id |

### knowledge_tables
| Index | Columns |
|-------|---------|
| ix_kt_doc | document_id |
| ix_kt_page | document_id, page_number (composite) |
| uq_table_doc | table_hash, document_id (UNIQUE composite) |

### knowledge_images
| Index | Columns |
|-------|---------|
| ix_ki_doc | document_id |
| ix_ki_page | document_id, page_number (composite) |
| uq_image_doc | image_hash, document_id (UNIQUE composite) |

### document_versions
| Index | Columns |
|-------|---------|
| ix_dv_doc | document_id |
| ix_dv_version | document_id, version_number (composite) |

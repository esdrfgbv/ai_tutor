"""Add production indexes and knowledge models

Revision ID: 6d206975075a
Revises: 7ae92e94cc3d
Create Date: 2026-06-23 10:11:02.881526

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6d206975075a'
down_revision: Union[str, None] = '7ae92e94cc3d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('admin_mock_tests', schema=None) as batch_op:
        batch_op.create_index('ix_amt_created_at', ['created_at'], unique=False)

    with op.batch_alter_table('canonical_questions', schema=None) as batch_op:
        batch_op.create_index('ix_cq_doc_class', ['doc_class'], unique=False)

    with op.batch_alter_table('conversation_messages', schema=None) as batch_op:
        batch_op.create_index('ix_conv_messages_conv_role', ['conversation_id', 'role'], unique=False)
        batch_op.create_index('ix_conv_messages_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_conv_messages_role', ['role'], unique=False)

    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.create_index('ix_conversations_subject', ['subject'], unique=False)
        batch_op.create_index('ix_conversations_updated_at', ['updated_at'], unique=False)

    with op.batch_alter_table('ingestion_audit_logs', schema=None) as batch_op:
        batch_op.create_index('ix_ial_stage', ['stage'], unique=False)
        batch_op.create_index('ix_ial_timestamp', ['timestamp'], unique=False)

    with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
        batch_op.create_index('ix_kc_doc_chapter', ['doc_chapter'], unique=False)
        batch_op.create_index('ix_kc_doc_chunk_index', ['document_id', 'chunk_index'], unique=False)
        batch_op.create_index('ix_kc_doc_class', ['doc_class'], unique=False)
        batch_op.create_index('ix_kc_doc_subject', ['doc_subject'], unique=False)
        batch_op.create_index('ix_kc_source_type', ['source_type'], unique=False)

    with op.batch_alter_table('knowledge_documents', schema=None) as batch_op:
        batch_op.create_index('ix_kd_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_kd_is_deleted', ['is_deleted'], unique=False)
        batch_op.create_index('ix_kd_status_completed', ['processing_status', 'processing_completed_at'], unique=False)
        batch_op.create_index('ix_kd_status_created', ['processing_status', 'created_at'], unique=False)

    with op.batch_alter_table('metadata_registry', schema=None) as batch_op:
        batch_op.create_index('ix_mr_is_active', ['is_active'], unique=False)
        batch_op.create_index('ix_mr_sort', ['sort_order', 'display_label'], unique=False)

    with op.batch_alter_table('parent_child_links', schema=None) as batch_op:
        batch_op.create_index('ix_pcl_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_pcl_parent_id', ['parent_id'], unique=False)
        batch_op.create_index('ix_pcl_status', ['status'], unique=False)

    with op.batch_alter_table('processing_jobs', schema=None) as batch_op:
        batch_op.create_index('ix_pj_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_pj_started_at', ['started_at'], unique=False)

    with op.batch_alter_table('progress_tracking', schema=None) as batch_op:
        batch_op.create_index('ix_progress_tracking_student_id', ['student_id'], unique=False)

    with op.batch_alter_table('question_bank', schema=None) as batch_op:
        batch_op.create_index('ix_question_bank_difficulty', ['difficulty'], unique=False)
        batch_op.create_index('ix_question_bank_has_image', ['has_image'], unique=False)
        batch_op.create_index(batch_op.f('ix_question_bank_question_hash'), ['question_hash'], unique=True)
        batch_op.create_index('ix_question_bank_question_type', ['question_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_question_bank_section_name'), ['section_name'], unique=False)
        batch_op.create_index(batch_op.f('ix_question_bank_source_id'), ['source_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_question_bank_year'), ['year'], unique=False)

    with op.batch_alter_table('question_bank_sources', schema=None) as batch_op:
        batch_op.create_index('ix_qbs_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_qbs_extraction_status', ['extraction_status'], unique=False)
        batch_op.create_index(batch_op.f('ix_question_bank_sources_document_hash'), ['document_hash'], unique=False)

    with op.batch_alter_table('questions', schema=None) as batch_op:
        batch_op.create_index('ix_questions_quiz_id', ['quiz_id'], unique=False)

    with op.batch_alter_table('quiz_attempts', schema=None) as batch_op:
        batch_op.create_index('ix_attempts_student_created', ['student_id', 'created_at'], unique=False)
        batch_op.create_index('ix_quiz_attempts_created_at', ['created_at'], unique=False)

    with op.batch_alter_table('quizzes', schema=None) as batch_op:
        batch_op.create_index('ix_quizzes_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_quizzes_is_published', ['is_published'], unique=False)
        batch_op.create_index(batch_op.f('ix_quizzes_normalized_module_name'), ['normalized_module_name'], unique=False)

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.create_index('ix_students_grade', ['grade'], unique=False)

    with op.batch_alter_table('study_bookmarks', schema=None) as batch_op:
        batch_op.create_index('ix_study_bookmarks_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_study_bookmarks_subject', ['subject'], unique=False)

    with op.batch_alter_table('study_notes', schema=None) as batch_op:
        batch_op.create_index('ix_study_notes_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_study_notes_subject', ['subject'], unique=False)

    with op.batch_alter_table('study_plans', schema=None) as batch_op:
        batch_op.create_index('ix_study_plans_week_start', ['week_start'], unique=False)

    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.create_index('ix_sessions_student_started', ['student_id', 'started_at'], unique=False)
        batch_op.create_index('ix_study_sessions_active_status', ['active_status'], unique=False)
        batch_op.create_index('ix_study_sessions_heartbeat', ['last_heartbeat_at'], unique=False)
        batch_op.create_index('ix_study_sessions_started_at', ['started_at'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('study_sessions', schema=None) as batch_op:
        batch_op.drop_index('ix_study_sessions_started_at')
        batch_op.drop_index('ix_study_sessions_heartbeat')
        batch_op.drop_index('ix_study_sessions_active_status')
        batch_op.drop_index('ix_sessions_student_started')

    with op.batch_alter_table('study_plans', schema=None) as batch_op:
        batch_op.drop_index('ix_study_plans_week_start')

    with op.batch_alter_table('study_notes', schema=None) as batch_op:
        batch_op.drop_index('ix_study_notes_subject')
        batch_op.drop_index('ix_study_notes_created_at')

    with op.batch_alter_table('study_bookmarks', schema=None) as batch_op:
        batch_op.drop_index('ix_study_bookmarks_subject')
        batch_op.drop_index('ix_study_bookmarks_created_at')

    with op.batch_alter_table('students', schema=None) as batch_op:
        batch_op.drop_index('ix_students_grade')

    with op.batch_alter_table('quizzes', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_quizzes_normalized_module_name'))
        batch_op.drop_index('ix_quizzes_is_published')
        batch_op.drop_index('ix_quizzes_created_at')

    with op.batch_alter_table('quiz_attempts', schema=None) as batch_op:
        batch_op.drop_index('ix_quiz_attempts_created_at')
        batch_op.drop_index('ix_attempts_student_created')

    with op.batch_alter_table('questions', schema=None) as batch_op:
        batch_op.drop_index('ix_questions_quiz_id')

    with op.batch_alter_table('question_bank_sources', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_question_bank_sources_document_hash'))
        batch_op.drop_index('ix_qbs_extraction_status')
        batch_op.drop_index('ix_qbs_created_at')

    with op.batch_alter_table('question_bank', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_question_bank_year'))
        batch_op.drop_index(batch_op.f('ix_question_bank_source_id'))
        batch_op.drop_index(batch_op.f('ix_question_bank_section_name'))
        batch_op.drop_index('ix_question_bank_question_type')
        batch_op.drop_index(batch_op.f('ix_question_bank_question_hash'))
        batch_op.drop_index('ix_question_bank_has_image')
        batch_op.drop_index('ix_question_bank_difficulty')

    with op.batch_alter_table('progress_tracking', schema=None) as batch_op:
        batch_op.drop_index('ix_progress_tracking_student_id')

    with op.batch_alter_table('processing_jobs', schema=None) as batch_op:
        batch_op.drop_index('ix_pj_started_at')
        batch_op.drop_index('ix_pj_created_at')

    with op.batch_alter_table('parent_child_links', schema=None) as batch_op:
        batch_op.drop_index('ix_pcl_status')
        batch_op.drop_index('ix_pcl_parent_id')
        batch_op.drop_index('ix_pcl_created_at')

    with op.batch_alter_table('metadata_registry', schema=None) as batch_op:
        batch_op.drop_index('ix_mr_sort')
        batch_op.drop_index('ix_mr_is_active')

    with op.batch_alter_table('knowledge_documents', schema=None) as batch_op:
        batch_op.drop_index('ix_kd_status_created')
        batch_op.drop_index('ix_kd_status_completed')
        batch_op.drop_index('ix_kd_is_deleted')
        batch_op.drop_index('ix_kd_created_at')

    with op.batch_alter_table('knowledge_chunks', schema=None) as batch_op:
        batch_op.drop_index('ix_kc_source_type')
        batch_op.drop_index('ix_kc_doc_subject')
        batch_op.drop_index('ix_kc_doc_class')
        batch_op.drop_index('ix_kc_doc_chunk_index')
        batch_op.drop_index('ix_kc_doc_chapter')

    with op.batch_alter_table('ingestion_audit_logs', schema=None) as batch_op:
        batch_op.drop_index('ix_ial_timestamp')
        batch_op.drop_index('ix_ial_stage')

    with op.batch_alter_table('conversations', schema=None) as batch_op:
        batch_op.drop_index('ix_conversations_updated_at')
        batch_op.drop_index('ix_conversations_subject')

    with op.batch_alter_table('conversation_messages', schema=None) as batch_op:
        batch_op.drop_index('ix_conv_messages_role')
        batch_op.drop_index('ix_conv_messages_created_at')
        batch_op.drop_index('ix_conv_messages_conv_role')

    with op.batch_alter_table('canonical_questions', schema=None) as batch_op:
        batch_op.drop_index('ix_cq_doc_class')

    with op.batch_alter_table('admin_mock_tests', schema=None) as batch_op:
        batch_op.drop_index('ix_amt_created_at')

"""add processing job current_stage

Revision ID: b7a9f3c2f1f4
Revises: ee1856674737
Create Date: 2026-06-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7a9f3c2f1f4'
down_revision = 'ee1856674737'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('processing_jobs', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_stage', sa.String(length=80), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('processing_jobs', schema=None) as batch_op:
        batch_op.drop_column('current_stage')

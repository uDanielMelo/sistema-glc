"""locais certame_id nullable

Revision ID: 400fbda4e743
Revises: 68a94dc598d3
Create Date: 2026-05-11

"""
from alembic import op

revision = '400fbda4e743'
down_revision = '68a94dc598d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column('locais', 'certame_id', nullable=True)


def downgrade() -> None:
    op.alter_column('locais', 'certame_id', nullable=False)

"""local responsavel

Revision ID: j5e6f7g8h9i0
Revises: i4d5e6f7g8h9
Create Date: 2026-05-12

"""
from alembic import op
import sqlalchemy as sa

revision = 'j5e6f7g8h9i0'
down_revision = 'i4d5e6f7g8h9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('locais', sa.Column('responsavel_nome', sa.String(), nullable=True))
    op.add_column('locais', sa.Column('responsavel_contato', sa.String(), nullable=True))


def downgrade():
    op.drop_column('locais', 'responsavel_contato')
    op.drop_column('locais', 'responsavel_nome')

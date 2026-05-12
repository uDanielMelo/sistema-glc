"""local_info colaboradores_ids

Revision ID: l7h8i9j0k1l2
Revises: k6f7g8h9i0j1
Create Date: 2026-05-12

"""
from alembic import op
import sqlalchemy as sa

revision = 'l7h8i9j0k1l2'
down_revision = 'k6f7g8h9i0j1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('local_aplicacao_info', sa.Column('colaboradores_ids', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('local_aplicacao_info', 'colaboradores_ids')

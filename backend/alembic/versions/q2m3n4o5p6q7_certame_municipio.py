"""certame: adiciona campo municipio

Revision ID: q2m3n4o5p6q7
Revises: p1l2m3n4o5p6
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'q2m3n4o5p6q7'
down_revision = 'p1l2m3n4o5p6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('certames', sa.Column('municipio', sa.String(), nullable=True))


def downgrade():
    op.drop_column('certames', 'municipio')

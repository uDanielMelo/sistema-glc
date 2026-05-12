"""local numero_recinto

Revision ID: m8i9j0k1l2m3
Revises: l7h8i9j0k1l2
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'm8i9j0k1l2m3'
down_revision = 'l7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('locais', sa.Column('numero_recinto', sa.String(), nullable=True))


def downgrade():
    op.drop_column('locais', 'numero_recinto')

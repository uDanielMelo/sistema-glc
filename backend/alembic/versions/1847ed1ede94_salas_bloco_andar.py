"""salas bloco andar

Revision ID: 1847ed1ede94
Revises: 400fbda4e743
Create Date: 2026-05-11

"""
from alembic import op
import sqlalchemy as sa

revision = '1847ed1ede94'
down_revision = '400fbda4e743'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('salas', sa.Column('bloco', sa.String(), nullable=True))
    op.add_column('salas', sa.Column('andar', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('salas', 'andar')
    op.drop_column('salas', 'bloco')

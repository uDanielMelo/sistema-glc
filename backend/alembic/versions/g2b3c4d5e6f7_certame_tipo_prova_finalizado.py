"""certame tipo_prova e status finalizado

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'g2b3c4d5e6f7'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE certamestatus ADD VALUE IF NOT EXISTS 'finalizado'")
    op.execute("CREATE TYPE tipoprova AS ENUM ('objetiva', 'discursiva', 'pratica', 'taf', 'redacao', 'outro')")
    op.add_column('certames', sa.Column('tipo_prova', sa.Enum('objetiva', 'discursiva', 'pratica', 'taf', 'redacao', 'outro', name='tipoprova'), nullable=True))


def downgrade() -> None:
    op.drop_column('certames', 'tipo_prova')
    op.execute("DROP TYPE IF EXISTS tipoprova")
    # PostgreSQL does not support removing enum values; downgrade leaves 'finalizado' in certamestatus

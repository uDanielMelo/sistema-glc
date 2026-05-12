"""candidatos_certame

Revision ID: i4d5e6f7g8h9
Revises: h3c4d5e6f7g8
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'i4d5e6f7g8h9'
down_revision: Union[str, None] = 'h3c4d5e6f7g8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'candidatos_certame',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), sa.ForeignKey('certames.id', ondelete='CASCADE'), nullable=False),
        sa.Column('numero_inscricao', sa.String(), nullable=True),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('vaga', sa.String(), nullable=True),
        sa.Column('dia_prova', sa.Date(), nullable=True),
        sa.Column('horario', sa.String(10), nullable=True),
        sa.Column('local_nome', sa.String(), nullable=True),
        sa.Column('sala', sa.String(), nullable=True),
        sa.Column('condicao_especial', sa.Text(), nullable=True),
        sa.Column('importado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_candidatos_certame_certame_id', 'candidatos_certame', ['certame_id'])
    op.create_index('ix_candidatos_certame_local_sala', 'candidatos_certame', ['certame_id', 'local_nome', 'sala'])


def downgrade() -> None:
    op.drop_index('ix_candidatos_certame_local_sala', 'candidatos_certame')
    op.drop_index('ix_candidatos_certame_certame_id', 'candidatos_certame')
    op.drop_table('candidatos_certame')

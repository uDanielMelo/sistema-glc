"""certame_arquivos

Revision ID: h3c4d5e6f7g8
Revises: g2b3c4d5e6f7
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h3c4d5e6f7g8'
down_revision: Union[str, None] = 'g2b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'certame_arquivos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), sa.ForeignKey('certames.id', ondelete='CASCADE'), nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('nome_original', sa.String(), nullable=False),
        sa.Column('caminho', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('tamanho', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_certame_arquivos_certame_id', 'certame_arquivos', ['certame_id'])


def downgrade() -> None:
    op.drop_index('ix_certame_arquivos_certame_id', 'certame_arquivos')
    op.drop_table('certame_arquivos')

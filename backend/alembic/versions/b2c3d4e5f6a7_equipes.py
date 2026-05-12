"""equipes — coordenadores e fiscais standalone

Revision ID: b2c3d4e5f6a7
Revises: 68a94dc598d3
Create Date: 2026-05-11 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = '68a94dc598d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'coordenadores',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('celular', sa.String(), nullable=True),
        sa.Column('chave_pix', sa.String(), nullable=True),
        sa.Column('tipo_chave_pix', sa.String(), nullable=True),
        sa.Column('banco', sa.String(), nullable=True),
        sa.Column('agencia', sa.String(), nullable=True),
        sa.Column('conta', sa.String(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )

    # Recriar fiscais com estrutura simplificada (sem certame_id/local_id)
    op.drop_table('fiscais')
    op.create_table(
        'fiscais',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('telefone', sa.String(), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('coordenadores')
    op.drop_table('fiscais')
    op.create_table(
        'fiscais',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('local_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('celular', sa.String(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('presenca', sa.Enum('pendente', 'presente', 'ausente', name='presencastatus'), nullable=True),
        sa.Column('observacao_coordenador', sa.Text(), nullable=True),
        sa.Column('confirmado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['local_id'], ['locais.id']),
        sa.PrimaryKeyConstraint('id'),
    )

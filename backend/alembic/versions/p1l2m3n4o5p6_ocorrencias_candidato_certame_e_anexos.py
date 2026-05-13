"""ocorrencias: candidato_certame_id e tabela ocorrencia_anexos

Revision ID: p1l2m3n4o5p6
Revises: o0k1l2m3n4o5
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'p1l2m3n4o5p6'
down_revision = 'o0k1l2m3n4o5'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('ocorrencias', sa.Column(
        'candidato_certame_id', sa.String(),
        sa.ForeignKey('candidatos_certame.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.add_column('ocorrencias', sa.Column('atualizado_em', sa.DateTime(), nullable=True))

    op.create_table(
        'ocorrencia_anexos',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('ocorrencia_id', sa.String(), sa.ForeignKey('ocorrencias.id', ondelete='CASCADE'), nullable=False),
        sa.Column('nome_original', sa.String(), nullable=False),
        sa.Column('caminho', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('tamanho', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('ocorrencia_anexos')
    op.drop_column('ocorrencias', 'atualizado_em')
    op.drop_column('ocorrencias', 'candidato_certame_id')

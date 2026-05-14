"""certame_agenda: linha do tempo de atividades

Revision ID: r3n4o5p6q7r8
Revises: q2m3n4o5p6q7
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'r3n4o5p6q7r8'
down_revision = 'q2m3n4o5p6q7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'certame_agenda',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('certame_id', sa.String(), sa.ForeignKey('certames.id', ondelete='CASCADE'), nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('local', sa.String(), nullable=True),
        sa.Column('data', sa.Date(), nullable=True),
        sa.Column('horario', sa.String(10), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table('certame_agenda')

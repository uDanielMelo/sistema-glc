"""periodo horario labels

Revision ID: u6q7r8s9t0u1
Revises: t5p6q7r8s9t0
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'u6q7r8s9t0u1'
down_revision = 't5p6q7r8s9t0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'periodo_horario_labels',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('dia_prova', sa.Date(), nullable=True),
        sa.Column('horario', sa.String(10), nullable=True),
        sa.Column('label', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('certame_id', 'dia_prova', 'horario', name='uq_periodo_horario_label'),
    )


def downgrade():
    op.drop_table('periodo_horario_labels')

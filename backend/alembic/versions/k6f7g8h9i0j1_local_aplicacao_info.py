"""local aplicacao info

Revision ID: k6f7g8h9i0j1
Revises: j5e6f7g8h9i0
Create Date: 2026-05-12

"""
from alembic import op
import sqlalchemy as sa

revision = 'k6f7g8h9i0j1'
down_revision = 'j5e6f7g8h9i0'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'local_aplicacao_info',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), sa.ForeignKey('certames.id', ondelete='CASCADE'), nullable=False),
        sa.Column('local_nome', sa.String(), nullable=False),
        sa.Column('responsaveis', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_local_aplicacao_info_certame', 'local_aplicacao_info', ['certame_id', 'local_nome'])


def downgrade():
    op.drop_index('ix_local_aplicacao_info_certame')
    op.drop_table('local_aplicacao_info')

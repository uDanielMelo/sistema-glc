"""fiscal_pagamento e local_grupo_fiscais

Revision ID: o0k1l2m3n4o5
Revises: n9j0k1l2m3n4
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'o0k1l2m3n4o5'
down_revision = 'n9j0k1l2m3n4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('fiscais_grupo', sa.Column('pagamento', sa.String(), nullable=True))
    op.add_column('local_aplicacao_info', sa.Column(
        'grupo_fiscais_id', sa.String(),
        sa.ForeignKey('grupos_fiscais.id', ondelete='SET NULL'),
        nullable=True,
    ))


def downgrade():
    op.drop_column('local_aplicacao_info', 'grupo_fiscais_id')
    op.drop_column('fiscais_grupo', 'pagamento')

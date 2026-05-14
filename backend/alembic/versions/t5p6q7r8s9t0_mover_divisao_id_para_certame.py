"""periodo: move divisao_id de periodos para certames

Revision ID: t5p6q7r8s9t0
Revises: s4o5p6q7r8s9
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 't5p6q7r8s9t0'
down_revision = 's4o5p6q7r8s9'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('fk_periodos_divisao_id', 'periodos', type_='foreignkey')
    op.drop_column('periodos', 'divisao_id')
    op.add_column('certames', sa.Column('divisao_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_certames_divisao_id',
        'certames', 'certames',
        ['divisao_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_certames_divisao_id', 'certames', type_='foreignkey')
    op.drop_column('certames', 'divisao_id')
    op.add_column('periodos', sa.Column('divisao_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_periodos_divisao_id',
        'periodos', 'certames',
        ['divisao_id'], ['id'],
        ondelete='SET NULL',
    )

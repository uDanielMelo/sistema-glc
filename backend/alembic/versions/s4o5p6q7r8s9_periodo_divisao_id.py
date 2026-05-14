"""periodo: vinculo com divisao

Revision ID: s4o5p6q7r8s9
Revises: r3n4o5p6q7r8
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 's4o5p6q7r8s9'
down_revision = 'r3n4o5p6q7r8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('periodos', sa.Column('divisao_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_periodos_divisao_id',
        'periodos', 'certames',
        ['divisao_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade():
    op.drop_constraint('fk_periodos_divisao_id', 'periodos', type_='foreignkey')
    op.drop_column('periodos', 'divisao_id')

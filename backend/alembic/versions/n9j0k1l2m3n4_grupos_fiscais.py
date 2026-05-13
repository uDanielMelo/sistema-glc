"""grupos_fiscais

Revision ID: n9j0k1l2m3n4
Revises: m8i9j0k1l2m3
Branch Labels: None
Depends On: None

"""
from alembic import op
import sqlalchemy as sa

revision = 'n9j0k1l2m3n4'
down_revision = 'm8i9j0k1l2m3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'grupos_fiscais',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('certame_id', sa.String(), sa.ForeignKey('certames.id'), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_grupos_fiscais_certame_id', 'grupos_fiscais', ['certame_id'])

    op.create_table(
        'fiscais_grupo',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('grupo_id', sa.String(), sa.ForeignKey('grupos_fiscais.id'), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('nascimento', sa.Date(), nullable=True),
        sa.Column('celular', sa.String(), nullable=True),
        sa.Column('funcao', sa.String(), nullable=True),
        sa.Column('periodo', sa.String(), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_fiscais_grupo_grupo_id', 'fiscais_grupo', ['grupo_id'])


def downgrade():
    op.drop_index('ix_fiscais_grupo_grupo_id', 'fiscais_grupo')
    op.drop_table('fiscais_grupo')
    op.drop_index('ix_grupos_fiscais_certame_id', 'grupos_fiscais')
    op.drop_table('grupos_fiscais')

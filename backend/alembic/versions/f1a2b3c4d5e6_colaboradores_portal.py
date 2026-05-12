"""colaboradores portal — merge branches + status, auth, dados pessoais, vinculo certame

Revision ID: f1a2b3c4d5e6
Revises: 1847ed1ede94, b2c3d4e5f6a7
Create Date: 2026-05-12
"""
from typing import Sequence, Union, Tuple
from alembic import op
import sqlalchemy as sa

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Tuple[str, ...]] = ('1847ed1ede94', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE colaboradorstatus AS ENUM ('pendente', 'ativo', 'inativo')")

    op.add_column('coordenadores', sa.Column('email', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('senha_hash', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('token_convite', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('token_expiry', sa.DateTime(), nullable=True))
    op.add_column('coordenadores', sa.Column(
        'status',
        sa.Enum('pendente', 'ativo', 'inativo', name='colaboradorstatus', create_type=False),
        nullable=False,
        server_default='pendente',
    ))
    op.add_column('coordenadores', sa.Column('data_nascimento', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('rg', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('cep', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('endereco', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('numero', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('complemento', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('bairro', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('cidade', sa.String(), nullable=True))
    op.add_column('coordenadores', sa.Column('estado', sa.String(2), nullable=True))

    op.create_index('ix_coordenadores_token_convite', 'coordenadores', ['token_convite'], unique=True)

    op.create_table(
        'certame_colaboradores',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('coordenador_id', sa.String(), nullable=False),
        sa.Column('funcao', sa.String(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['coordenador_id'], ['coordenadores.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('certame_id', 'coordenador_id', name='uq_certame_colaborador'),
    )


def downgrade() -> None:
    op.drop_table('certame_colaboradores')
    op.drop_index('ix_coordenadores_token_convite', 'coordenadores')
    op.drop_column('coordenadores', 'estado')
    op.drop_column('coordenadores', 'cidade')
    op.drop_column('coordenadores', 'bairro')
    op.drop_column('coordenadores', 'complemento')
    op.drop_column('coordenadores', 'numero')
    op.drop_column('coordenadores', 'endereco')
    op.drop_column('coordenadores', 'cep')
    op.drop_column('coordenadores', 'rg')
    op.drop_column('coordenadores', 'data_nascimento')
    op.drop_column('coordenadores', 'status')
    op.drop_column('coordenadores', 'token_expiry')
    op.drop_column('coordenadores', 'token_convite')
    op.drop_column('coordenadores', 'senha_hash')
    op.drop_column('coordenadores', 'email')
    op.execute("DROP TYPE IF EXISTS colaboradorstatus")

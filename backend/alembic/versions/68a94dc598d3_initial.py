"""initial

Revision ID: 68a94dc598d3
Revises:
Create Date: 2026-04-29 13:01:56.276017

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68a94dc598d3'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Enum types ────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE userrole AS ENUM ('admin', 'logistica', 'coordenador')")
    op.execute("CREATE TYPE certamestatus AS ENUM ('rascunho', 'planejamento', 'em_andamento', 'finalizado', 'concluido', 'cancelado')")
    op.execute("CREATE TYPE tipoprova AS ENUM ('objetiva', 'discursiva', 'pratica', 'taf', 'redacao', 'outro')")
    op.execute("CREATE TYPE importacaotipo AS ENUM ('candidatos', 'locais', 'equipes', 'condicoes_especiais', 'cargos_periodos')")
    op.execute("CREATE TYPE importacaostatus AS ENUM ('pendente', 'processando', 'concluido', 'erro')")
    op.execute("CREATE TYPE colaboradorstatus AS ENUM ('pendente', 'ativo', 'inativo')")
    op.execute("CREATE TYPE ocorrenciatipo AS ENUM ('candidato', 'fiscal', 'local', 'material', 'outros')")
    op.execute("CREATE TYPE presencastatus AS ENUM ('pendente', 'presente', 'ausente')")

    # ── tenants ───────────────────────────────────────────────────────────────
    op.create_table(
        'tenants',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('slug', sa.String(), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug'),
    )

    # ── coordenadores ─────────────────────────────────────────────────────────
    op.create_table(
        'coordenadores',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('celular', sa.String(), nullable=True),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('senha_hash', sa.String(), nullable=True),
        sa.Column('token_convite', sa.String(), nullable=True),
        sa.Column('token_expiry', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'ativo', 'inativo', name='colaboradorstatus', create_type=False), nullable=False),
        sa.Column('data_nascimento', sa.String(), nullable=True),
        sa.Column('rg', sa.String(), nullable=True),
        sa.Column('cep', sa.String(), nullable=True),
        sa.Column('endereco', sa.String(), nullable=True),
        sa.Column('numero', sa.String(), nullable=True),
        sa.Column('complemento', sa.String(), nullable=True),
        sa.Column('bairro', sa.String(), nullable=True),
        sa.Column('cidade', sa.String(), nullable=True),
        sa.Column('estado', sa.String(length=2), nullable=True),
        sa.Column('chave_pix', sa.String(), nullable=True),
        sa.Column('tipo_chave_pix', sa.String(), nullable=True),
        sa.Column('banco', sa.String(), nullable=True),
        sa.Column('agencia', sa.String(), nullable=True),
        sa.Column('conta', sa.String(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cpf'),
        sa.UniqueConstraint('token_convite'),
    )

    # ── certames ──────────────────────────────────────────────────────────────
    op.create_table(
        'certames',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('numero_edital', sa.String(), nullable=True),
        sa.Column('orgao', sa.String(), nullable=True),
        sa.Column('tipo', sa.String(), nullable=True),
        sa.Column('data_aplicacao', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('rascunho', 'planejamento', 'em_andamento', 'finalizado', 'concluido', 'cancelado', name='certamestatus', create_type=False), nullable=True),
        sa.Column('tipo_prova', sa.Enum('objetiva', 'discursiva', 'pratica', 'taf', 'redacao', 'outro', name='tipoprova', create_type=False), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── usuarios ──────────────────────────────────────────────────────────────
    op.create_table(
        'usuarios',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('tenant_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('senha_hash', sa.String(), nullable=False),
        sa.Column('role', sa.Enum('admin', 'logistica', 'coordenador', name='userrole', create_type=False), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )

    # ── grupos_fiscais ────────────────────────────────────────────────────────
    op.create_table(
        'grupos_fiscais',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── fiscais_grupo ─────────────────────────────────────────────────────────
    op.create_table(
        'fiscais_grupo',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('grupo_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('nascimento', sa.Date(), nullable=True),
        sa.Column('celular', sa.String(), nullable=True),
        sa.Column('funcao', sa.String(), nullable=True),
        sa.Column('periodo', sa.String(), nullable=True),
        sa.Column('observacao', sa.Text(), nullable=True),
        sa.Column('pagamento', sa.String(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['grupo_id'], ['grupos_fiscais.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── local_aplicacao_info ──────────────────────────────────────────────────
    op.create_table(
        'local_aplicacao_info',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('local_nome', sa.String(), nullable=False),
        sa.Column('responsaveis', sa.JSON(), nullable=True),
        sa.Column('colaboradores_ids', sa.JSON(), nullable=True),
        sa.Column('grupo_fiscais_id', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['grupo_fiscais_id'], ['grupos_fiscais.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── importacoes ───────────────────────────────────────────────────────────
    op.create_table(
        'importacoes',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('tipo', sa.Enum('candidatos', 'locais', 'equipes', 'condicoes_especiais', 'cargos_periodos', name='importacaotipo', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('pendente', 'processando', 'concluido', 'erro', name='importacaostatus', create_type=False), nullable=True),
        sa.Column('nome_arquivo', sa.String(), nullable=True),
        sa.Column('total_linhas', sa.Integer(), nullable=True),
        sa.Column('linhas_importadas', sa.Integer(), nullable=True),
        sa.Column('erros', sa.JSON(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('concluido_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── locais ────────────────────────────────────────────────────────────────
    op.create_table(
        'locais',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=True),
        sa.Column('coordenador_id', sa.String(), nullable=True),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('codigo', sa.String(), nullable=True),
        sa.Column('numero_recinto', sa.String(), nullable=True),
        sa.Column('endereco', sa.String(), nullable=True),
        sa.Column('bairro', sa.String(), nullable=True),
        sa.Column('cidade', sa.String(), nullable=True),
        sa.Column('uf', sa.String(length=2), nullable=True),
        sa.Column('cep', sa.String(length=9), nullable=True),
        sa.Column('total_salas', sa.Integer(), nullable=True),
        sa.Column('capacidade_total', sa.Integer(), nullable=True),
        sa.Column('acessivel', sa.Boolean(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('responsavel_nome', sa.String(), nullable=True),
        sa.Column('responsavel_contato', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.ForeignKeyConstraint(['coordenador_id'], ['usuarios.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── periodos ──────────────────────────────────────────────────────────────
    op.create_table(
        'periodos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('numero', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(), nullable=True),
        sa.Column('data_hora', sa.DateTime(), nullable=True),
        sa.Column('duracao_minutos', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── cargos ────────────────────────────────────────────────────────────────
    op.create_table(
        'cargos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('periodo_id', sa.String(), nullable=True),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('codigo', sa.String(), nullable=True),
        sa.Column('total_inscritos', sa.Integer(), nullable=True),
        sa.Column('total_deferidos', sa.Integer(), nullable=True),
        sa.Column('nivel', sa.String(), nullable=True),
        sa.Column('area', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.ForeignKeyConstraint(['periodo_id'], ['periodos.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── fiscais ───────────────────────────────────────────────────────────────
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

    # ── certame_colaboradores ─────────────────────────────────────────────────
    op.create_table(
        'certame_colaboradores',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('coordenador_id', sa.String(), nullable=False),
        sa.Column('funcao', sa.String(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.ForeignKeyConstraint(['coordenador_id'], ['coordenadores.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── certame_arquivos ──────────────────────────────────────────────────────
    op.create_table(
        'certame_arquivos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('titulo', sa.String(), nullable=False),
        sa.Column('nome_original', sa.String(), nullable=False),
        sa.Column('caminho', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('tamanho', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── candidatos_certame ────────────────────────────────────────────────────
    op.create_table(
        'candidatos_certame',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('numero_inscricao', sa.String(), nullable=True),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('vaga', sa.String(), nullable=True),
        sa.Column('dia_prova', sa.Date(), nullable=True),
        sa.Column('horario', sa.String(length=10), nullable=True),
        sa.Column('local_nome', sa.String(), nullable=True),
        sa.Column('sala', sa.String(), nullable=True),
        sa.Column('condicao_especial', sa.Text(), nullable=True),
        sa.Column('importado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── salas ─────────────────────────────────────────────────────────────────
    op.create_table(
        'salas',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('local_id', sa.String(), nullable=False),
        sa.Column('numero', sa.String(), nullable=False),
        sa.Column('capacidade', sa.Integer(), nullable=True),
        sa.Column('bloco', sa.String(), nullable=True),
        sa.Column('andar', sa.String(), nullable=True),
        sa.Column('acessivel', sa.Boolean(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['local_id'], ['locais.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── candidatos ────────────────────────────────────────────────────────────
    op.create_table(
        'candidatos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('cargo_id', sa.String(), nullable=False),
        sa.Column('nome', sa.String(), nullable=False),
        sa.Column('cpf', sa.String(), nullable=True),
        sa.Column('inscricao', sa.String(), nullable=True),
        sa.Column('local_id', sa.String(), nullable=True),
        sa.Column('sala', sa.String(), nullable=True),
        sa.Column('condicoes_especiais', sa.JSON(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['cargo_id'], ['cargos.id']),
        sa.ForeignKeyConstraint(['local_id'], ['locais.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── ocorrencias ───────────────────────────────────────────────────────────
    op.create_table(
        'ocorrencias',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('certame_id', sa.String(), nullable=False),
        sa.Column('local_id', sa.String(), nullable=True),
        sa.Column('sala_id', sa.String(), nullable=True),
        sa.Column('candidato_id', sa.String(), nullable=True),
        sa.Column('candidato_certame_id', sa.String(), nullable=True),
        sa.Column('registrado_por_id', sa.String(), nullable=False),
        sa.Column('tipo', sa.Enum('candidato', 'fiscal', 'local', 'material', 'outros', name='ocorrenciatipo', create_type=False), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.Column('atualizado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['candidato_id'], ['candidatos.id']),
        sa.ForeignKeyConstraint(['candidato_certame_id'], ['candidatos_certame.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['certame_id'], ['certames.id']),
        sa.ForeignKeyConstraint(['local_id'], ['locais.id']),
        sa.ForeignKeyConstraint(['registrado_por_id'], ['usuarios.id']),
        sa.ForeignKeyConstraint(['sala_id'], ['salas.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ── ocorrencia_anexos ─────────────────────────────────────────────────────
    op.create_table(
        'ocorrencia_anexos',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('ocorrencia_id', sa.String(), nullable=False),
        sa.Column('nome_original', sa.String(), nullable=False),
        sa.Column('caminho', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('tamanho', sa.Integer(), nullable=True),
        sa.Column('criado_em', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ocorrencia_id'], ['ocorrencias.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('ocorrencia_anexos')
    op.drop_table('ocorrencias')
    op.drop_table('candidatos')
    op.drop_table('salas')
    op.drop_table('candidatos_certame')
    op.drop_table('certame_arquivos')
    op.drop_table('certame_colaboradores')
    op.drop_table('fiscais')
    op.drop_table('cargos')
    op.drop_table('periodos')
    op.drop_table('locais')
    op.drop_table('importacoes')
    op.drop_table('local_aplicacao_info')
    op.drop_table('fiscais_grupo')
    op.drop_table('grupos_fiscais')
    op.drop_table('usuarios')
    op.drop_table('certames')
    op.drop_table('coordenadores')
    op.drop_table('tenants')
    op.execute('DROP TYPE IF EXISTS presencastatus')
    op.execute('DROP TYPE IF EXISTS ocorrenciatipo')
    op.execute('DROP TYPE IF EXISTS colaboradorstatus')
    op.execute('DROP TYPE IF EXISTS importacaostatus')
    op.execute('DROP TYPE IF EXISTS importacaotipo')
    op.execute('DROP TYPE IF EXISTS tipoprova')
    op.execute('DROP TYPE IF EXISTS certamestatus')
    op.execute('DROP TYPE IF EXISTS userrole')

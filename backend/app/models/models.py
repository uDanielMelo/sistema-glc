"""
GLC — Modelos de dados
Estrutura preparada para multi-tenant (SaaS) desde o início.
tenant_id presente em todas as entidades principais.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text,
    ForeignKey, Enum as SAEnum, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


# ── Helpers ──────────────────────────────────────────────────────────────────

def gen_uuid():
    return str(uuid.uuid4())

def now():
    return datetime.utcnow()


# ── Enums ─────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    logistica = "logistica"
    coordenador = "coordenador"


class CertameStatus(str, enum.Enum):
    rascunho = "rascunho"
    planejamento = "planejamento"
    em_andamento = "em_andamento"
    concluido = "concluido"
    cancelado = "cancelado"


class ImportacaoTipo(str, enum.Enum):
    candidatos = "candidatos"
    locais = "locais"
    equipes = "equipes"
    condicoes_especiais = "condicoes_especiais"
    cargos_periodos = "cargos_periodos"


class ImportacaoStatus(str, enum.Enum):
    pendente = "pendente"
    processando = "processando"
    concluido = "concluido"
    erro = "erro"


class OcorrenciaTipo(str, enum.Enum):
    candidato = "candidato"
    fiscal = "fiscal"
    local = "local"
    material = "material"
    outros = "outros"


class PresencaStatus(str, enum.Enum):
    pendente = "pendente"
    presente = "presente"
    ausente = "ausente"


# ── Tenant (preparado para SaaS) ──────────────────────────────────────────────

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=gen_uuid)
    nome = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=now)

    usuarios = relationship("Usuario", back_populates="tenant")
    certames = relationship("Certame", back_populates="tenant")


# ── Usuários ──────────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(String, primary_key=True, default=gen_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    role = Column(SAEnum(UserRole), nullable=False, default=UserRole.logistica)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=now)
    atualizado_em = Column(DateTime, default=now, onupdate=now)

    tenant = relationship("Tenant", back_populates="usuarios")
    locais_coordenados = relationship("Local", back_populates="coordenador")
    ocorrencias = relationship("Ocorrencia", back_populates="registrado_por")


# ── Certame ───────────────────────────────────────────────────────────────────

class Certame(Base):
    __tablename__ = "certames"

    id = Column(String, primary_key=True, default=gen_uuid)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False)
    titulo = Column(String, nullable=False)
    numero_edital = Column(String)
    orgao = Column(String)
    tipo = Column(String)                   # concurso público, PSS, etc
    data_aplicacao = Column(DateTime)
    status = Column(SAEnum(CertameStatus), default=CertameStatus.rascunho)
    observacoes = Column(Text)
    criado_em = Column(DateTime, default=now)
    atualizado_em = Column(DateTime, default=now, onupdate=now)

    tenant = relationship("Tenant", back_populates="certames")
    periodos = relationship("Periodo", back_populates="certame", cascade="all, delete-orphan")
    cargos = relationship("Cargo", back_populates="certame", cascade="all, delete-orphan")
    locais = relationship("Local", back_populates="certame", cascade="all, delete-orphan")
    importacoes = relationship("Importacao", back_populates="certame", cascade="all, delete-orphan")


# ── Períodos e Cargos ─────────────────────────────────────────────────────────

class Periodo(Base):
    __tablename__ = "periodos"

    id = Column(String, primary_key=True, default=gen_uuid)
    certame_id = Column(String, ForeignKey("certames.id"), nullable=False)
    numero = Column(Integer, nullable=False)       # 1, 2, 3...
    label = Column(String)                         # "Manhã", "Tarde", "1º Período"
    data_hora = Column(DateTime)
    duracao_minutos = Column(Integer)

    certame = relationship("Certame", back_populates="periodos")
    cargos = relationship("Cargo", back_populates="periodo")


class Cargo(Base):
    __tablename__ = "cargos"

    id = Column(String, primary_key=True, default=gen_uuid)
    certame_id = Column(String, ForeignKey("certames.id"), nullable=False)
    periodo_id = Column(String, ForeignKey("periodos.id"), nullable=True)
    nome = Column(String, nullable=False)
    codigo = Column(String)
    total_inscritos = Column(Integer, default=0)
    total_deferidos = Column(Integer, default=0)
    nivel = Column(String)
    area = Column(String)

    certame = relationship("Certame", back_populates="cargos")
    periodo = relationship("Periodo", back_populates="cargos")
    candidatos = relationship("Candidato", back_populates="cargo")


# ── Candidatos ────────────────────────────────────────────────────────────────

class Candidato(Base):
    __tablename__ = "candidatos"

    id = Column(String, primary_key=True, default=gen_uuid)
    cargo_id = Column(String, ForeignKey("cargos.id"), nullable=False)
    nome = Column(String, nullable=False)
    cpf = Column(String)
    inscricao = Column(String)
    local_id = Column(String, ForeignKey("locais.id"), nullable=True)
    sala = Column(String)
    condicoes_especiais = Column(JSON, default=list)  # ["cadeirante", "lactante", ...]
    observacoes = Column(Text)

    cargo = relationship("Cargo", back_populates="candidatos")
    local = relationship("Local", back_populates="candidatos")
    ocorrencias = relationship("Ocorrencia", back_populates="candidato")


# ── Locais de Prova ───────────────────────────────────────────────────────────

class Local(Base):
    __tablename__ = "locais"

    id = Column(String, primary_key=True, default=gen_uuid)
    certame_id = Column(String, ForeignKey("certames.id"), nullable=False)
    coordenador_id = Column(String, ForeignKey("usuarios.id"), nullable=True)
    nome = Column(String, nullable=False)
    codigo = Column(String)
    endereco = Column(String)
    bairro = Column(String)
    cidade = Column(String)
    uf = Column(String(2))
    cep = Column(String(9))
    total_salas = Column(Integer, default=0)
    capacidade_total = Column(Integer, default=0)
    acessivel = Column(Boolean, default=False)
    observacoes = Column(Text)

    certame = relationship("Certame", back_populates="locais")
    coordenador = relationship("Usuario", back_populates="locais_coordenados")
    salas = relationship("Sala", back_populates="local", cascade="all, delete-orphan")
    fiscais = relationship("Fiscal", back_populates="local", cascade="all, delete-orphan")
    candidatos = relationship("Candidato", back_populates="local")
    ocorrencias = relationship("Ocorrencia", back_populates="local")


class Sala(Base):
    __tablename__ = "salas"

    id = Column(String, primary_key=True, default=gen_uuid)
    local_id = Column(String, ForeignKey("locais.id"), nullable=False)
    numero = Column(String, nullable=False)
    capacidade = Column(Integer, default=0)
    acessivel = Column(Boolean, default=False)
    observacoes = Column(Text)

    local = relationship("Local", back_populates="salas")
    ocorrencias = relationship("Ocorrencia", back_populates="sala")


# ── Equipes e Fiscais ─────────────────────────────────────────────────────────

class Fiscal(Base):
    __tablename__ = "fiscais"

    id = Column(String, primary_key=True, default=gen_uuid)
    local_id = Column(String, ForeignKey("locais.id"), nullable=False)
    nome = Column(String, nullable=False)
    celular = Column(String)
    observacoes = Column(Text)
    presenca = Column(SAEnum(PresencaStatus), default=PresencaStatus.pendente)
    observacao_coordenador = Column(Text)   # anotação do coordenador no dia
    confirmado_em = Column(DateTime)

    local = relationship("Local", back_populates="fiscais")


# ── Ocorrências ───────────────────────────────────────────────────────────────

class Ocorrencia(Base):
    __tablename__ = "ocorrencias"

    id = Column(String, primary_key=True, default=gen_uuid)
    certame_id = Column(String, ForeignKey("certames.id"), nullable=False)
    local_id = Column(String, ForeignKey("locais.id"), nullable=True)
    sala_id = Column(String, ForeignKey("salas.id"), nullable=True)
    candidato_id = Column(String, ForeignKey("candidatos.id"), nullable=True)
    registrado_por_id = Column(String, ForeignKey("usuarios.id"), nullable=False)
    tipo = Column(SAEnum(OcorrenciaTipo), nullable=False)
    descricao = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=now)

    local = relationship("Local", back_populates="ocorrencias")
    sala = relationship("Sala", back_populates="ocorrencias")
    candidato = relationship("Candidato", back_populates="ocorrencias")
    registrado_por = relationship("Usuario", back_populates="ocorrencias")


# ── Importações ───────────────────────────────────────────────────────────────

class Importacao(Base):
    __tablename__ = "importacoes"

    id = Column(String, primary_key=True, default=gen_uuid)
    certame_id = Column(String, ForeignKey("certames.id"), nullable=False)
    tipo = Column(SAEnum(ImportacaoTipo), nullable=False)
    status = Column(SAEnum(ImportacaoStatus), default=ImportacaoStatus.pendente)
    nome_arquivo = Column(String)
    total_linhas = Column(Integer, default=0)
    linhas_importadas = Column(Integer, default=0)
    erros = Column(JSON, default=list)
    criado_em = Column(DateTime, default=now)
    concluido_em = Column(DateTime)

    certame = relationship("Certame", back_populates="importacoes")

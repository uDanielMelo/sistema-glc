from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Coordenadores ─────────────────────────────────────────────────────────────

class CoordenadorCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    celular: Optional[str] = None
    chave_pix: Optional[str] = None
    tipo_chave_pix: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    observacoes: Optional[str] = None


class CoordenadorUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    celular: Optional[str] = None
    chave_pix: Optional[str] = None
    tipo_chave_pix: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    observacoes: Optional[str] = None


class CoordenadorResponse(BaseModel):
    id: str
    nome: str
    cpf: Optional[str] = None
    celular: Optional[str] = None
    chave_pix: Optional[str] = None
    tipo_chave_pix: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None
    observacoes: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True


# ── Fiscais ───────────────────────────────────────────────────────────────────

class FiscalCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    observacao: Optional[str] = None


class FiscalUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    observacao: Optional[str] = None


class FiscalResponse(BaseModel):
    id: str
    nome: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    observacao: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True

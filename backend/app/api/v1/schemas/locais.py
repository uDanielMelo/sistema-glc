from pydantic import BaseModel
from typing import Optional


class LocalCreate(BaseModel):
    certame_id: str
    nome: str
    codigo: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    total_salas: Optional[int] = 0
    capacidade_total: Optional[int] = 0
    acessivel: Optional[bool] = False
    observacoes: Optional[str] = None


class LocalUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    total_salas: Optional[int] = None
    capacidade_total: Optional[int] = None
    acessivel: Optional[bool] = None
    observacoes: Optional[str] = None
    coordenador_id: Optional[str] = None


class SalaCreate(BaseModel):
    local_id: str
    numero: str
    capacidade: Optional[int] = 0
    acessivel: Optional[bool] = False
    observacoes: Optional[str] = None


class SalaResponse(BaseModel):
    id: str
    local_id: str
    numero: str
    capacidade: int
    acessivel: bool
    observacoes: Optional[str] = None

    class Config:
        from_attributes = True


class LocalResponse(BaseModel):
    id: str
    certame_id: str
    nome: str
    codigo: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = None
    total_salas: int
    capacidade_total: int
    acessivel: bool
    observacoes: Optional[str] = None
    coordenador_id: Optional[str] = None
    salas: list[SalaResponse] = []

    class Config:
        from_attributes = True
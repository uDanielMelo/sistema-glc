from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class FiscalGrupoCreate(BaseModel):
    nome: str
    cpf: Optional[str] = None
    nascimento: Optional[date] = None
    celular: Optional[str] = None
    funcao: Optional[str] = None
    periodo: Optional[str] = None
    observacao: Optional[str] = None
    pagamento: Optional[str] = None


class FiscalGrupoUpdate(BaseModel):
    nome: Optional[str] = None
    cpf: Optional[str] = None
    nascimento: Optional[date] = None
    celular: Optional[str] = None
    funcao: Optional[str] = None
    periodo: Optional[str] = None
    observacao: Optional[str] = None
    pagamento: Optional[str] = None


class FiscalGrupoResponse(BaseModel):
    id: str
    grupo_id: str
    nome: str
    cpf: Optional[str] = None
    nascimento: Optional[date] = None
    celular: Optional[str] = None
    funcao: Optional[str] = None
    periodo: Optional[str] = None
    observacao: Optional[str] = None
    pagamento: Optional[str] = None
    criado_em: datetime

    class Config:
        from_attributes = True


class GrupoFiscaisCreate(BaseModel):
    nome: str


class GrupoFiscaisUpdate(BaseModel):
    nome: str


class GrupoFiscaisResponse(BaseModel):
    id: str
    certame_id: str
    nome: str
    criado_em: datetime
    fiscais: list[FiscalGrupoResponse] = []

    class Config:
        from_attributes = True

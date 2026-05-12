from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.models import CertameStatus, TipoProva


class CertameCreate(BaseModel):
    titulo: str
    numero_edital: Optional[str] = None
    orgao: Optional[str] = None
    tipo: Optional[str] = None
    tipo_prova: Optional[TipoProva] = None
    data_aplicacao: Optional[datetime] = None
    observacoes: Optional[str] = None


class CertameUpdate(BaseModel):
    titulo: Optional[str] = None
    numero_edital: Optional[str] = None
    orgao: Optional[str] = None
    tipo: Optional[str] = None
    tipo_prova: Optional[TipoProva] = None
    data_aplicacao: Optional[datetime] = None
    observacoes: Optional[str] = None
    status: Optional[CertameStatus] = None


class CertameResponse(BaseModel):
    id: str
    tenant_id: str
    titulo: str
    numero_edital: Optional[str] = None
    orgao: Optional[str] = None
    tipo: Optional[str] = None
    tipo_prova: Optional[TipoProva] = None
    data_aplicacao: Optional[datetime] = None
    status: CertameStatus
    observacoes: Optional[str] = None
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
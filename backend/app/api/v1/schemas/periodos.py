from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PeriodoCreate(BaseModel):
    certame_id: str
    numero: int
    label: Optional[str] = None
    data_hora: Optional[datetime] = None
    duracao_minutos: Optional[int] = None


class PeriodoUpdate(BaseModel):
    label: Optional[str] = None
    data_hora: Optional[datetime] = None
    duracao_minutos: Optional[int] = None


class PeriodoResponse(BaseModel):
    id: str
    certame_id: str
    numero: int
    label: Optional[str] = None
    data_hora: Optional[datetime] = None
    duracao_minutos: Optional[int] = None

    class Config:
        from_attributes = True


class CargoResponse(BaseModel):
    id: str
    certame_id: str
    periodo_id: Optional[str] = None
    nome: str
    codigo: Optional[str] = None
    total_inscritos: int
    total_deferidos: int
    nivel: Optional[str] = None
    area: Optional[str] = None

    class Config:
        from_attributes = True


class CargoUpdate(BaseModel):
    periodo_id: Optional[str] = None
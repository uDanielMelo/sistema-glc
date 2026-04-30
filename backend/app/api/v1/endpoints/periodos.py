from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.services.periodos import (
    listar_periodos, criar_periodo, atualizar_periodo, deletar_periodo,
    listar_cargos, atualizar_cargo, importar_cargos_xlsx, criar_cargo_manual
)
from app.api.v1.schemas.periodos import (
    PeriodoCreate, PeriodoUpdate, PeriodoResponse,
    CargoResponse, CargoUpdate
)
from app.core.deps import require_logistica
from app.models.models import Usuario

router = APIRouter()


@router.get("/periodos", response_model=list[PeriodoResponse])
def get_periodos(
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_periodos(db, certame_id)


@router.post("/periodos", response_model=PeriodoResponse, status_code=201)
def post_periodo(
    data: PeriodoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_periodo(db, data)


@router.put("/periodos/{periodo_id}", response_model=PeriodoResponse)
def put_periodo(
    periodo_id: str,
    data: PeriodoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_periodo(db, periodo_id, data)


@router.delete("/periodos/{periodo_id}", status_code=204)
def delete_periodo(
    periodo_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_periodo(db, periodo_id)


@router.get("/cargos", response_model=list[CargoResponse])
def get_cargos(
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_cargos(db, certame_id)


@router.put("/cargos/{cargo_id}", response_model=CargoResponse)
def put_cargo(
    cargo_id: str,
    data: CargoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_cargo(db, cargo_id, data.periodo_id)


@router.post("/cargos/importar", response_model=list[CargoResponse])
def importar_cargos(
    certame_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    conteudo = file.file.read()
    return importar_cargos_xlsx(db, certame_id, conteudo)

from pydantic import BaseModel

class CargoManualCreate(BaseModel):
    certame_id: str
    nome: str

@router.post("/cargos", response_model=CargoResponse, status_code=201)
def post_cargo_manual(
    data: CargoManualCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_cargo_manual(db, data.certame_id, data.nome)
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.schemas.equipes import (
    CoordenadorCreate, CoordenadorUpdate, CoordenadorResponse,
    FiscalCreate, FiscalUpdate, FiscalResponse,
)
from app.api.v1.services.equipes import (
    listar_coordenadores, criar_coordenador, atualizar_coordenador, deletar_coordenador,
    listar_fiscais, criar_fiscal, atualizar_fiscal, deletar_fiscal,
)
from app.core.deps import require_logistica
from app.models.models import Usuario

router = APIRouter()


# ── Coordenadores ─────────────────────────────────────────────────────────────

@router.get("/coordenadores", response_model=list[CoordenadorResponse])
def get_coordenadores(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_coordenadores(db)


@router.post("/coordenadores", response_model=CoordenadorResponse, status_code=201)
def post_coordenador(
    data: CoordenadorCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_coordenador(db, data)


@router.put("/coordenadores/{coord_id}", response_model=CoordenadorResponse)
def put_coordenador(
    coord_id: str,
    data: CoordenadorUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_coordenador(db, coord_id, data)


@router.delete("/coordenadores/{coord_id}", status_code=204)
def delete_coordenador(
    coord_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_coordenador(db, coord_id)


# ── Fiscais ───────────────────────────────────────────────────────────────────

@router.get("/fiscais", response_model=list[FiscalResponse])
def get_fiscais(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_fiscais(db)


@router.post("/fiscais", response_model=FiscalResponse, status_code=201)
def post_fiscal(
    data: FiscalCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_fiscal(db, data)


@router.put("/fiscais/{fiscal_id}", response_model=FiscalResponse)
def put_fiscal(
    fiscal_id: str,
    data: FiscalUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_fiscal(db, fiscal_id, data)


@router.delete("/fiscais/{fiscal_id}", status_code=204)
def delete_fiscal(
    fiscal_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_fiscal(db, fiscal_id)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.schemas.certames import CertameCreate, CertameUpdate, CertameResponse
from app.api.v1.services.certames import (
    listar_certames, buscar_certame, criar_certame,
    atualizar_certame, deletar_certame, mudar_status
)
from app.core.deps import get_current_user, require_logistica
from app.models.models import Usuario, CertameStatus

router = APIRouter()


@router.get("/", response_model=list[CertameResponse])
def listar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    return listar_certames(db, current_user.tenant_id)


@router.get("/{certame_id}", response_model=CertameResponse)
def buscar(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return buscar_certame(db, certame_id, current_user.tenant_id)


@router.post("/", response_model=CertameResponse, status_code=201)
def criar(
    data: CertameCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    return criar_certame(db, data, current_user.tenant_id)


@router.put("/{certame_id}", response_model=CertameResponse)
def atualizar(
    certame_id: str,
    data: CertameUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    return atualizar_certame(db, certame_id, data, current_user.tenant_id)


@router.delete("/{certame_id}", status_code=204)
def deletar(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    deletar_certame(db, certame_id, current_user.tenant_id)


@router.patch("/{certame_id}/status", response_model=CertameResponse)
def atualizar_status(
    certame_id: str,
    status: CertameStatus,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    return mudar_status(db, certame_id, status, current_user.tenant_id)
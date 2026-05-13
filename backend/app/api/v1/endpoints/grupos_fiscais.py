from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import require_logistica
from app.models.models import Usuario
from app.api.v1.schemas.grupos_fiscais import (
    GrupoFiscaisCreate, GrupoFiscaisUpdate, GrupoFiscaisResponse,
    FiscalGrupoCreate, FiscalGrupoUpdate, FiscalGrupoResponse,
)
from app.api.v1.services.grupos_fiscais import (
    listar_grupos, criar_grupo, atualizar_grupo, deletar_grupo,
    adicionar_fiscal, atualizar_fiscal, deletar_fiscal, importar_fiscais,
)

router = APIRouter()


@router.get("/{certame_id}/grupos-fiscais", response_model=list[GrupoFiscaisResponse])
def get_grupos(
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_grupos(db, certame_id)


@router.post("/{certame_id}/grupos-fiscais", response_model=GrupoFiscaisResponse, status_code=201)
def post_grupo(
    certame_id: str,
    data: GrupoFiscaisCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_grupo(db, certame_id, data)


@router.put("/{certame_id}/grupos-fiscais/{grupo_id}", response_model=GrupoFiscaisResponse)
def put_grupo(
    certame_id: str,
    grupo_id: str,
    data: GrupoFiscaisUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_grupo(db, certame_id, grupo_id, data)


@router.delete("/{certame_id}/grupos-fiscais/{grupo_id}", status_code=204)
def delete_grupo(
    certame_id: str,
    grupo_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_grupo(db, certame_id, grupo_id)


@router.post("/{certame_id}/grupos-fiscais/{grupo_id}/fiscais", response_model=FiscalGrupoResponse, status_code=201)
def post_fiscal(
    certame_id: str,
    grupo_id: str,
    data: FiscalGrupoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return adicionar_fiscal(db, grupo_id, certame_id, data)


@router.put("/{certame_id}/grupos-fiscais/{grupo_id}/fiscais/{fiscal_id}", response_model=FiscalGrupoResponse)
def put_fiscal(
    certame_id: str,
    grupo_id: str,
    fiscal_id: str,
    data: FiscalGrupoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_fiscal(db, grupo_id, fiscal_id, certame_id, data)


@router.delete("/{certame_id}/grupos-fiscais/{grupo_id}/fiscais/{fiscal_id}", status_code=204)
def delete_fiscal_route(
    certame_id: str,
    grupo_id: str,
    fiscal_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_fiscal(db, grupo_id, fiscal_id, certame_id)


@router.post("/{certame_id}/grupos-fiscais/{grupo_id}/importar", status_code=200)
def post_importar(
    certame_id: str,
    grupo_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    conteudo = file.file.read()
    total = importar_fiscais(db, grupo_id, certame_id, conteudo, file.filename or "file.xlsx")
    return {"importados": total}

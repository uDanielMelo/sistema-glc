from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.schemas.locais import (
    LocalCreate, LocalUpdate, LocalResponse, SalaCreate, SalaResponse
)
from app.api.v1.services.locais import (
    listar_locais, buscar_local, criar_local,
    atualizar_local, deletar_local, criar_sala,
    deletar_sala, importar_locais_xlsx
)
from app.core.deps import require_logistica
from app.models.models import Usuario

router = APIRouter()


@router.get("/locais", response_model=list[LocalResponse])
def get_locais(
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_locais(db, certame_id)


@router.get("/locais/{local_id}", response_model=LocalResponse)
def get_local(
    local_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return buscar_local(db, local_id)


@router.post("/locais", response_model=LocalResponse, status_code=201)
def post_local(
    data: LocalCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_local(db, data)


@router.put("/locais/{local_id}", response_model=LocalResponse)
def put_local(
    local_id: str,
    data: LocalUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_local(db, local_id, data)


@router.delete("/locais/{local_id}", status_code=204)
def delete_local(
    local_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_local(db, local_id)


@router.post("/locais/{local_id}/salas", response_model=SalaResponse, status_code=201)
def post_sala(
    local_id: str,
    data: SalaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    data.local_id = local_id
    return criar_sala(db, data)


@router.delete("/salas/{sala_id}", status_code=204)
def delete_sala(
    sala_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_sala(db, sala_id)


@router.post("/locais/importar", response_model=list[LocalResponse])
def importar_locais(
    certame_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    conteudo = file.file.read()
    return importar_locais_xlsx(db, certame_id, conteudo)
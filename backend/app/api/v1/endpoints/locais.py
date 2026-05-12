from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.api.v1.schemas.locais import (
    LocalCreate, LocalUpdate, LocalResponse, VincularCertameSchema,
    SalaCreate, SalaUpdate, SalasBulkCreate, SalaResponse
)
from app.api.v1.services.locais import (
    listar_locais, buscar_local, criar_local, atualizar_local, deletar_local,
    vincular_certame, criar_sala, atualizar_sala, deletar_sala, criar_salas_lote,
    importar_salas, importar_locais_xlsx
)
from app.core.deps import require_logistica
from app.models.models import Usuario

router = APIRouter()


@router.get("/locais", response_model=list[LocalResponse])
def get_locais(
    certame_id: Optional[str] = Query(None),
    standalone: bool = Query(False),
    search: Optional[str] = Query(None),
    cidade: Optional[str] = Query(None),
    uf: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return listar_locais(db, certame_id=certame_id, standalone=standalone, search=search, cidade=cidade, uf=uf)


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


@router.patch("/locais/{local_id}/certame", response_model=LocalResponse)
def patch_local_certame(
    local_id: str,
    data: VincularCertameSchema,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return vincular_certame(db, local_id, data.certame_id)


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


@router.post("/locais/{local_id}/salas/bulk", response_model=list[SalaResponse], status_code=201)
def post_salas_bulk(
    local_id: str,
    data: SalasBulkCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return criar_salas_lote(db, local_id, data)


@router.post("/locais/{local_id}/salas/importar", response_model=list[SalaResponse])
def post_importar_salas(
    local_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    conteudo = file.file.read()
    return importar_salas(db, local_id, conteudo, file.filename or "")


@router.put("/salas/{sala_id}", response_model=SalaResponse)
def put_sala(
    sala_id: str,
    data: SalaUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return atualizar_sala(db, sala_id, data)


@router.delete("/salas/{sala_id}", status_code=204)
def delete_sala(
    sala_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_sala(db, sala_id)


@router.post("/locais/importar", response_model=list[LocalResponse])
def importar_locais(
    file: UploadFile = File(...),
    certame_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    conteudo = file.file.read()
    return importar_locais_xlsx(db, conteudo, certame_id=certame_id)

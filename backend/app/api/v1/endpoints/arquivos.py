import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import require_logistica, get_current_user
from app.models.models import CertameArquivo, Certame, Usuario
from datetime import datetime

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "uploads"


def _get_certame(db: Session, certame_id: str, tenant_id: str) -> Certame:
    c = db.query(Certame).filter(Certame.id == certame_id, Certame.tenant_id == tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    return c


@router.get("/{certame_id}/arquivos")
def listar(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    arquivos = (
        db.query(CertameArquivo)
        .filter(CertameArquivo.certame_id == certame_id)
        .order_by(CertameArquivo.criado_em.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "titulo": a.titulo,
            "nome_original": a.nome_original,
            "mime_type": a.mime_type,
            "tamanho": a.tamanho,
            "criado_em": a.criado_em.isoformat() if a.criado_em else None,
        }
        for a in arquivos
    ]


@router.post("/{certame_id}/arquivos", status_code=201)
async def upload(
    certame_id: str,
    titulo: str = Form(...),
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)

    destino_dir = UPLOAD_DIR / certame_id
    destino_dir.mkdir(parents=True, exist_ok=True)

    arquivo_id = str(uuid.uuid4())
    ext = Path(arquivo.filename or "").suffix
    nome_no_disco = f"{arquivo_id}{ext}"
    caminho = destino_dir / nome_no_disco

    conteudo = await arquivo.read()
    caminho.write_bytes(conteudo)

    registro = CertameArquivo(
        id=arquivo_id,
        certame_id=certame_id,
        titulo=titulo,
        nome_original=arquivo.filename or nome_no_disco,
        caminho=str(caminho),
        mime_type=arquivo.content_type,
        tamanho=len(conteudo),
        criado_em=datetime.utcnow(),
    )
    db.add(registro)
    db.commit()

    return {
        "id": registro.id,
        "titulo": registro.titulo,
        "nome_original": registro.nome_original,
        "mime_type": registro.mime_type,
        "tamanho": registro.tamanho,
        "criado_em": registro.criado_em.isoformat(),
    }


@router.get("/{certame_id}/arquivos/{arquivo_id}/visualizar")
def visualizar(
    certame_id: str,
    arquivo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    arq = db.query(CertameArquivo).filter(
        CertameArquivo.id == arquivo_id,
        CertameArquivo.certame_id == certame_id,
    ).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    if not Path(arq.caminho).exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no disco")
    return FileResponse(
        path=arq.caminho,
        media_type=arq.mime_type or "application/octet-stream",
        filename=arq.nome_original,
    )


@router.delete("/{certame_id}/arquivos/{arquivo_id}", status_code=204)
def deletar(
    certame_id: str,
    arquivo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    arq = db.query(CertameArquivo).filter(
        CertameArquivo.id == arquivo_id,
        CertameArquivo.certame_id == certame_id,
    ).first()
    if not arq:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    try:
        Path(arq.caminho).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(arq)
    db.commit()

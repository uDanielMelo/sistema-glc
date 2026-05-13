import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Ocorrencia, OcorrenciaAnexo, OcorrenciaTipo, Certame, CandidatoCertame, Usuario

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent / "uploads" / "ocorrencias"


def _get_certame(db: Session, certame_id: str, tenant_id: str) -> Certame:
    c = db.query(Certame).filter(Certame.id == certame_id, Certame.tenant_id == tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    return c


def _candidato_info(cand: CandidatoCertame) -> dict:
    return {
        "id": cand.id,
        "nome": cand.nome,
        "numero_inscricao": cand.numero_inscricao,
        "local_nome": cand.local_nome,
        "sala": cand.sala,
        "dia_prova": cand.dia_prova.isoformat() if cand.dia_prova else None,
        "horario": cand.horario,
    }


def _to_dict(o: Ocorrencia) -> dict:
    return {
        "id": o.id,
        "certame_id": o.certame_id,
        "tipo": o.tipo.value,
        "descricao": o.descricao,
        "candidato": _candidato_info(o.candidato_certame) if o.candidato_certame else None,
        "registrado_por": o.registrado_por.nome if o.registrado_por else None,
        "criado_em": o.criado_em.isoformat() if o.criado_em else None,
        "atualizado_em": o.atualizado_em.isoformat() if o.atualizado_em else None,
        "anexos": [
            {
                "id": a.id,
                "nome_original": a.nome_original,
                "mime_type": a.mime_type,
                "tamanho": a.tamanho,
                "criado_em": a.criado_em.isoformat() if a.criado_em else None,
            }
            for a in (o.anexos or [])
        ],
    }


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/{certame_id}/ocorrencias")
def listar(
    certame_id: str,
    tipo: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    q = db.query(Ocorrencia).filter(Ocorrencia.certame_id == certame_id)
    if tipo:
        try:
            q = q.filter(Ocorrencia.tipo == OcorrenciaTipo(tipo))
        except ValueError:
            pass
    return [_to_dict(o) for o in q.order_by(Ocorrencia.criado_em.desc()).all()]


# ── Create ────────────────────────────────────────────────────────────────────

class OcorrenciaCreate(BaseModel):
    tipo: str
    descricao: str
    candidato_certame_id: Optional[str] = None


@router.post("/{certame_id}/ocorrencias", status_code=201)
def criar(
    certame_id: str,
    body: OcorrenciaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    try:
        tipo_enum = OcorrenciaTipo(body.tipo)
    except ValueError:
        raise HTTPException(status_code=422, detail=f"Tipo inválido: {body.tipo}")

    candidato_certame_id = None
    if body.candidato_certame_id:
        cand = db.query(CandidatoCertame).filter(
            CandidatoCertame.id == body.candidato_certame_id,
            CandidatoCertame.certame_id == certame_id,
        ).first()
        if not cand:
            raise HTTPException(status_code=404, detail="Candidato não encontrado neste certame")
        candidato_certame_id = cand.id

    o = Ocorrencia(
        certame_id=certame_id,
        tipo=tipo_enum,
        descricao=body.descricao,
        candidato_certame_id=candidato_certame_id,
        registrado_por_id=current_user.id,
        criado_em=datetime.utcnow(),
        atualizado_em=datetime.utcnow(),
    )
    db.add(o)
    db.commit()
    db.refresh(o)
    return _to_dict(o)


# ── Update ────────────────────────────────────────────────────────────────────

class OcorrenciaUpdate(BaseModel):
    tipo: Optional[str] = None
    descricao: Optional[str] = None
    candidato_certame_id: Optional[str] = None


@router.patch("/{certame_id}/ocorrencias/{ocorrencia_id}")
def atualizar(
    certame_id: str,
    ocorrencia_id: str,
    body: OcorrenciaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    o = db.query(Ocorrencia).filter(
        Ocorrencia.id == ocorrencia_id,
        Ocorrencia.certame_id == certame_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    if body.tipo is not None:
        try:
            o.tipo = OcorrenciaTipo(body.tipo)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Tipo inválido: {body.tipo}")
    if body.descricao is not None:
        o.descricao = body.descricao
    if body.candidato_certame_id is not None:
        if body.candidato_certame_id == "":
            o.candidato_certame_id = None
        else:
            cand = db.query(CandidatoCertame).filter(
                CandidatoCertame.id == body.candidato_certame_id,
                CandidatoCertame.certame_id == certame_id,
            ).first()
            if not cand:
                raise HTTPException(status_code=404, detail="Candidato não encontrado")
            o.candidato_certame_id = cand.id

    o.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(o)
    return _to_dict(o)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{certame_id}/ocorrencias/{ocorrencia_id}", status_code=204)
def deletar(
    certame_id: str,
    ocorrencia_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    o = db.query(Ocorrencia).filter(
        Ocorrencia.id == ocorrencia_id,
        Ocorrencia.certame_id == certame_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")
    for anexo in o.anexos:
        try:
            Path(anexo.caminho).unlink(missing_ok=True)
        except Exception:
            pass
    db.delete(o)
    db.commit()


# ── Anexos ────────────────────────────────────────────────────────────────────

@router.post("/{certame_id}/ocorrencias/{ocorrencia_id}/anexos", status_code=201)
async def upload_anexo(
    certame_id: str,
    ocorrencia_id: str,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    o = db.query(Ocorrencia).filter(
        Ocorrencia.id == ocorrencia_id,
        Ocorrencia.certame_id == certame_id,
    ).first()
    if not o:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    destino_dir = UPLOAD_DIR / certame_id / ocorrencia_id
    destino_dir.mkdir(parents=True, exist_ok=True)

    anexo_id = str(uuid.uuid4())
    ext = Path(arquivo.filename or "").suffix
    nome_no_disco = f"{anexo_id}{ext}"
    caminho = destino_dir / nome_no_disco

    conteudo = await arquivo.read()
    caminho.write_bytes(conteudo)

    anexo = OcorrenciaAnexo(
        id=anexo_id,
        ocorrencia_id=ocorrencia_id,
        nome_original=arquivo.filename or nome_no_disco,
        caminho=str(caminho),
        mime_type=arquivo.content_type,
        tamanho=len(conteudo),
        criado_em=datetime.utcnow(),
    )
    db.add(anexo)
    db.commit()

    return {
        "id": anexo.id,
        "nome_original": anexo.nome_original,
        "mime_type": anexo.mime_type,
        "tamanho": anexo.tamanho,
        "criado_em": anexo.criado_em.isoformat(),
    }


@router.get("/{certame_id}/ocorrencias/{ocorrencia_id}/anexos/{anexo_id}/visualizar")
def visualizar_anexo(
    certame_id: str,
    ocorrencia_id: str,
    anexo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    anexo = db.query(OcorrenciaAnexo).filter(
        OcorrenciaAnexo.id == anexo_id,
        OcorrenciaAnexo.ocorrencia_id == ocorrencia_id,
    ).first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    if not Path(anexo.caminho).exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no disco")
    return FileResponse(
        path=anexo.caminho,
        media_type=anexo.mime_type or "application/octet-stream",
        filename=anexo.nome_original,
    )


@router.delete("/{certame_id}/ocorrencias/{ocorrencia_id}/anexos/{anexo_id}", status_code=204)
def deletar_anexo(
    certame_id: str,
    ocorrencia_id: str,
    anexo_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    anexo = db.query(OcorrenciaAnexo).filter(
        OcorrenciaAnexo.id == anexo_id,
        OcorrenciaAnexo.ocorrencia_id == ocorrencia_id,
    ).first()
    if not anexo:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    try:
        Path(anexo.caminho).unlink(missing_ok=True)
    except Exception:
        pass
    db.delete(anexo)
    db.commit()

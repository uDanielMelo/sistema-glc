from datetime import datetime, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import CertameAgenda, Certame, Usuario

router = APIRouter()


def _get_certame(db: Session, certame_id: str, tenant_id: str) -> Certame:
    c = db.query(Certame).filter(Certame.id == certame_id, Certame.tenant_id == tenant_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    return c


def _to_dict(item: CertameAgenda) -> dict:
    return {
        "id": item.id,
        "certame_id": item.certame_id,
        "titulo": item.titulo,
        "local": item.local,
        "data": item.data.isoformat() if item.data else None,
        "horario": item.horario,
        "observacao": item.observacao,
        "criado_em": item.criado_em.isoformat() if item.criado_em else None,
        "atualizado_em": item.atualizado_em.isoformat() if item.atualizado_em else None,
    }


@router.get("/{certame_id}/agenda")
def listar(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    items = (
        db.query(CertameAgenda)
        .filter(CertameAgenda.certame_id == certame_id)
        .order_by(CertameAgenda.data.asc().nullslast(), CertameAgenda.horario.asc().nullslast(), CertameAgenda.criado_em.asc())
        .all()
    )
    return [_to_dict(i) for i in items]


class AgendaCreate(BaseModel):
    titulo: str
    local: Optional[str] = None
    data: Optional[date] = None
    horario: Optional[str] = None
    observacao: Optional[str] = None


@router.post("/{certame_id}/agenda", status_code=201)
def criar(
    certame_id: str,
    body: AgendaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    item = CertameAgenda(
        certame_id=certame_id,
        titulo=body.titulo.strip(),
        local=body.local,
        data=body.data,
        horario=body.horario,
        observacao=body.observacao,
        criado_em=datetime.utcnow(),
        atualizado_em=datetime.utcnow(),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_dict(item)


class AgendaUpdate(BaseModel):
    titulo: Optional[str] = None
    local: Optional[str] = None
    data: Optional[date] = None
    horario: Optional[str] = None
    observacao: Optional[str] = None


@router.patch("/{certame_id}/agenda/{item_id}")
def atualizar(
    certame_id: str,
    item_id: str,
    body: AgendaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    item = db.query(CertameAgenda).filter(
        CertameAgenda.id == item_id,
        CertameAgenda.certame_id == certame_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item de agenda não encontrado")

    if body.titulo is not None:
        item.titulo = body.titulo.strip()
    if body.local is not None:
        item.local = body.local or None
    if body.data is not None:
        item.data = body.data
    if body.horario is not None:
        item.horario = body.horario or None
    if body.observacao is not None:
        item.observacao = body.observacao or None

    item.atualizado_em = datetime.utcnow()
    db.commit()
    db.refresh(item)
    return _to_dict(item)


@router.delete("/{certame_id}/agenda/{item_id}", status_code=204)
def deletar(
    certame_id: str,
    item_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    item = db.query(CertameAgenda).filter(
        CertameAgenda.id == item_id,
        CertameAgenda.certame_id == certame_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item de agenda não encontrado")
    db.delete(item)
    db.commit()

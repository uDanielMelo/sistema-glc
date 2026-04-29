from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Certame, CertameStatus
from app.api.v1.schemas.certames import CertameCreate, CertameUpdate


def listar_certames(db: Session, tenant_id: str) -> list[Certame]:
    return db.query(Certame).filter(Certame.tenant_id == tenant_id).order_by(Certame.criado_em.desc()).all()


def buscar_certame(db: Session, certame_id: str, tenant_id: str) -> Certame:
    certame = db.query(Certame).filter(
        Certame.id == certame_id,
        Certame.tenant_id == tenant_id
    ).first()
    if not certame:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    return certame


def criar_certame(db: Session, data: CertameCreate, tenant_id: str) -> Certame:
    certame = Certame(tenant_id=tenant_id, **data.model_dump())
    db.add(certame)
    db.commit()
    db.refresh(certame)
    return certame


def atualizar_certame(db: Session, certame_id: str, data: CertameUpdate, tenant_id: str) -> Certame:
    certame = buscar_certame(db, certame_id, tenant_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(certame, field, value)
    db.commit()
    db.refresh(certame)
    return certame


def deletar_certame(db: Session, certame_id: str, tenant_id: str) -> None:
    certame = buscar_certame(db, certame_id, tenant_id)
    db.delete(certame)
    db.commit()


def mudar_status(db: Session, certame_id: str, status: CertameStatus, tenant_id: str) -> Certame:
    certame = buscar_certame(db, certame_id, tenant_id)
    certame.status = status
    db.commit()
    db.refresh(certame)
    return certame

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Coordenador, Fiscal
from app.api.v1.schemas.equipes import CoordenadorCreate, CoordenadorUpdate, FiscalCreate, FiscalUpdate


# ── Coordenadores ─────────────────────────────────────────────────────────────

def listar_coordenadores(db: Session) -> list[Coordenador]:
    return db.query(Coordenador).order_by(Coordenador.nome).all()


def criar_coordenador(db: Session, data: CoordenadorCreate) -> Coordenador:
    coord = Coordenador(**data.model_dump())
    db.add(coord)
    db.commit()
    db.refresh(coord)
    return coord


def atualizar_coordenador(db: Session, coord_id: str, data: CoordenadorUpdate) -> Coordenador:
    coord = db.query(Coordenador).filter(Coordenador.id == coord_id).first()
    if not coord:
        raise HTTPException(status_code=404, detail="Coordenador não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(coord, field, value)
    db.commit()
    db.refresh(coord)
    return coord


def deletar_coordenador(db: Session, coord_id: str) -> None:
    coord = db.query(Coordenador).filter(Coordenador.id == coord_id).first()
    if not coord:
        raise HTTPException(status_code=404, detail="Coordenador não encontrado")
    db.delete(coord)
    db.commit()


# ── Fiscais ───────────────────────────────────────────────────────────────────

def listar_fiscais(db: Session) -> list[Fiscal]:
    return db.query(Fiscal).order_by(Fiscal.nome).all()


def criar_fiscal(db: Session, data: FiscalCreate) -> Fiscal:
    fiscal = Fiscal(**data.model_dump())
    db.add(fiscal)
    db.commit()
    db.refresh(fiscal)
    return fiscal


def atualizar_fiscal(db: Session, fiscal_id: str, data: FiscalUpdate) -> Fiscal:
    fiscal = db.query(Fiscal).filter(Fiscal.id == fiscal_id).first()
    if not fiscal:
        raise HTTPException(status_code=404, detail="Fiscal não encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(fiscal, field, value)
    db.commit()
    db.refresh(fiscal)
    return fiscal


def deletar_fiscal(db: Session, fiscal_id: str) -> None:
    fiscal = db.query(Fiscal).filter(Fiscal.id == fiscal_id).first()
    if not fiscal:
        raise HTTPException(status_code=404, detail="Fiscal não encontrado")
    db.delete(fiscal)
    db.commit()

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Periodo, Cargo, Certame
from app.api.v1.schemas.periodos import PeriodoCreate, PeriodoUpdate
import pandas as pd
import unicodedata
import re


def listar_periodos(db: Session, certame_id: str) -> list[Periodo]:
    return db.query(Periodo).filter(
        Periodo.certame_id == certame_id
    ).order_by(Periodo.numero).all()


def criar_periodo(db: Session, data: PeriodoCreate) -> Periodo:
    periodo = Periodo(**data.model_dump())
    db.add(periodo)
    db.commit()
    db.refresh(periodo)
    return periodo


def atualizar_periodo(db: Session, periodo_id: str, data: PeriodoUpdate) -> Periodo:
    periodo = db.query(Periodo).filter(Periodo.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Período não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(periodo, field, value)
    db.commit()
    db.refresh(periodo)
    return periodo


def deletar_periodo(db: Session, periodo_id: str) -> None:
    periodo = db.query(Periodo).filter(Periodo.id == periodo_id).first()
    if not periodo:
        raise HTTPException(status_code=404, detail="Período não encontrado")
    db.query(Cargo).filter(Cargo.periodo_id == periodo_id).update({"periodo_id": None})
    db.delete(periodo)
    db.commit()


def listar_cargos(db: Session, certame_id: str) -> list[Cargo]:
    return db.query(Cargo).filter(
        Cargo.certame_id == certame_id
    ).order_by(Cargo.nome).all()


def atualizar_cargo(db: Session, cargo_id: str, periodo_id: str | None) -> Cargo:
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    cargo.periodo_id = periodo_id
    db.commit()
    db.refresh(cargo)
    return cargo


def _norm(texto: str) -> str:
    s = unicodedata.normalize("NFD", texto)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.upper().strip()


def _int_safe(val) -> int:
    try:
        if pd.isna(val):
            return 0
        return int(float(val))
    except Exception:
        return 0


def deletar_cargo(db: Session, cargo_id: str) -> None:
    cargo = db.query(Cargo).filter(Cargo.id == cargo_id).first()
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
    db.delete(cargo)
    db.commit()


def limpar_cargos(db: Session, certame_id: str) -> None:
    certame = db.query(Certame).filter(Certame.id == certame_id).first()
    if not certame:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    db.query(Cargo).filter(Cargo.certame_id == certame_id).delete()
    db.commit()


def _carregar_dataframe(conteudo: bytes, filename: str) -> "pd.DataFrame":
    import io
    if filename.lower().endswith(".csv"):
        for enc in ("utf-8", "latin-1"):
            for sep in (",", ";", "\t"):
                try:
                    df = pd.read_csv(io.BytesIO(conteudo), sep=sep, encoding=enc)
                    if len(df.columns) > 1:
                        return df
                except Exception:
                    continue
        return pd.read_csv(io.BytesIO(conteudo), encoding="latin-1")
    else:
        xl = pd.ExcelFile(io.BytesIO(conteudo))
        aba = None
        for nome in xl.sheet_names:
            n = _norm(nome)
            if n in ("BANCO", "DADOS", "CARGOS", "INSCRICOES"):
                aba = nome
                break
        if aba is None:
            aba = xl.sheet_names[0]
        return pd.read_excel(io.BytesIO(conteudo), sheet_name=aba)


def importar_cargos(db: Session, certame_id: str, conteudo: bytes, filename: str = "") -> list[Cargo]:
    certame = db.query(Certame).filter(Certame.id == certame_id).first()
    if not certame:
        raise HTTPException(status_code=404, detail="Certame não encontrado")

    df = _carregar_dataframe(conteudo, filename)
    cols = {_norm(c): c for c in df.columns}

    col_cargo = None
    for candidate in ("CARGO", "FUNCAO", "FUNCAO", "EMPREGO", "NOME"):
        if candidate in cols:
            col_cargo = cols[candidate]
            break
    if col_cargo is None:
        col_cargo = df.columns[0]

    col_total = cols.get("TOTAL", cols.get("TOTAL INSCRICOES", None))
    col_confirmado = cols.get(
        "TOTAL CONFIRMADOS", cols.get("DEFERIDOS", cols.get("CONFIRMADOS", col_total))
    )

    # Preserva período dos cargos existentes pelo nome
    existentes = db.query(Cargo).filter(Cargo.certame_id == certame_id).all()
    periodo_por_nome = {_norm(c.nome): c.periodo_id for c in existentes}

    db.query(Cargo).filter(Cargo.certame_id == certame_id).delete()
    db.commit()

    cargos = []
    for _, row in df.iterrows():
        nome = str(row[col_cargo]).strip()
        if not nome or nome.lower() in ("nan", "none", "") or len(nome) < 3:
            continue
        if re.match(r"(TOTAL|INSCRI)", nome, re.IGNORECASE):
            continue

        total = _int_safe(row.get(col_total, 0)) if col_total else 0
        deferidos = _int_safe(row.get(col_confirmado, 0)) if col_confirmado else 0

        # Restaura período se nome já existia
        periodo_id = periodo_por_nome.get(_norm(nome))

        cargo = Cargo(
            certame_id=certame_id,
            nome=nome,
            total_inscritos=total,
            total_deferidos=deferidos,
            periodo_id=periodo_id,
        )
        db.add(cargo)
        cargos.append(cargo)

    db.commit()
    for c in cargos:
        db.refresh(c)
    return cargos

def criar_cargo_manual(db: Session, certame_id: str, nome: str) -> Cargo:
    certame = db.query(Certame).filter(Certame.id == certame_id).first()
    if not certame:
        raise HTTPException(status_code=404, detail="Certame não encontrado")
    cargo = Cargo(certame_id=certame_id, nome=nome, total_inscritos=0, total_deferidos=0)
    db.add(cargo)
    db.commit()
    db.refresh(cargo)
    return cargo
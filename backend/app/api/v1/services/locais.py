from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Local, Sala
from app.api.v1.schemas.locais import LocalCreate, LocalUpdate, SalaCreate


def listar_locais(db: Session, certame_id: str) -> list[Local]:
    return db.query(Local).filter(
        Local.certame_id == certame_id
    ).order_by(Local.nome).all()


def buscar_local(db: Session, local_id: str) -> Local:
    local = db.query(Local).filter(Local.id == local_id).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    return local


def criar_local(db: Session, data: LocalCreate) -> Local:
    local = Local(**data.model_dump())
    db.add(local)
    db.commit()
    db.refresh(local)
    return local


def atualizar_local(db: Session, local_id: str, data: LocalUpdate) -> Local:
    local = buscar_local(db, local_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(local, field, value)
    db.commit()
    db.refresh(local)
    return local


def deletar_local(db: Session, local_id: str) -> None:
    local = buscar_local(db, local_id)
    db.delete(local)
    db.commit()


def criar_sala(db: Session, data: SalaCreate) -> Sala:
    sala = Sala(**data.model_dump())
    db.add(sala)
    db.commit()
    # Atualiza total_salas do local
    local = db.query(Local).filter(Local.id == data.local_id).first()
    if local:
        local.total_salas = db.query(Sala).filter(Sala.local_id == data.local_id).count()
        local.capacidade_total = sum(
            s.capacidade for s in db.query(Sala).filter(Sala.local_id == data.local_id).all()
        )
        db.commit()
    db.refresh(sala)
    return sala


def deletar_sala(db: Session, sala_id: str) -> None:
    sala = db.query(Sala).filter(Sala.id == sala_id).first()
    if not sala:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    local_id = sala.local_id
    db.delete(sala)
    db.commit()
    local = db.query(Local).filter(Local.id == local_id).first()
    if local:
        local.total_salas = db.query(Sala).filter(Sala.local_id == local_id).count()
        local.capacidade_total = sum(
            s.capacidade for s in db.query(Sala).filter(Sala.local_id == local_id).all()
        )
        db.commit()


def importar_locais_xlsx(db: Session, certame_id: str, conteudo: bytes) -> list[Local]:
    import io
    import pandas as pd
    import unicodedata
    import re

    def _norm(texto: str) -> str:
        s = unicodedata.normalize("NFD", texto)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        s = re.sub(r"[^\w\s]", " ", s)
        return s.upper().strip()

    xl = pd.ExcelFile(io.BytesIO(conteudo))
    df = pd.read_excel(io.BytesIO(conteudo), sheet_name=xl.sheet_names[0])
    cols = {_norm(c): c for c in df.columns}

    col_nome = cols.get("NOME", cols.get("LOCAL", cols.get("ESCOLA", df.columns[0])))
    col_end = cols.get("ENDERECO", cols.get("ENDEREÇO", None))
    col_bairro = cols.get("BAIRRO", None)
    col_cidade = cols.get("CIDADE", None)
    col_uf = cols.get("UF", cols.get("ESTADO", None))
    col_cep = cols.get("CEP", None)
    col_cap = cols.get("CAPACIDADE", cols.get("CAPACIDADE TOTAL", None))
    col_salas = cols.get("SALAS", cols.get("TOTAL SALAS", None))

    locais = []
    for _, row in df.iterrows():
        nome = str(row[col_nome]).strip()
        if not nome or nome.lower() in ("nan", "none", "") or len(nome) < 3:
            continue

        local = Local(
            certame_id=certame_id,
            nome=nome,
            endereco=str(row[col_end]).strip() if col_end and str(row[col_end]) not in ("nan", "None") else None,
            bairro=str(row[col_bairro]).strip() if col_bairro and str(row[col_bairro]) not in ("nan", "None") else None,
            cidade=str(row[col_cidade]).strip() if col_cidade and str(row[col_cidade]) not in ("nan", "None") else None,
            uf=str(row[col_uf]).strip() if col_uf and str(row[col_uf]) not in ("nan", "None") else None,
            cep=str(row[col_cep]).strip() if col_cep and str(row[col_cep]) not in ("nan", "None") else None,
            capacidade_total=int(float(row[col_cap])) if col_cap and str(row[col_cap]) not in ("nan", "None") else 0,
            total_salas=int(float(row[col_salas])) if col_salas and str(row[col_salas]) not in ("nan", "None") else 0,
        )
        db.add(local)
        locais.append(local)

    db.commit()
    for l in locais:
        db.refresh(l)
    return locais
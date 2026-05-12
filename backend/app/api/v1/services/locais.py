from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Local, Sala
from app.api.v1.schemas.locais import LocalCreate, LocalUpdate, SalaCreate, SalaUpdate, SalasBulkCreate


def _recalc_local(db: Session, local_id: str) -> None:
    salas = db.query(Sala).filter(Sala.local_id == local_id).all()
    local = db.query(Local).filter(Local.id == local_id).first()
    if local:
        local.total_salas = len(salas)
        local.capacidade_total = sum(s.capacidade for s in salas)
        db.commit()


def listar_locais(
    db: Session,
    certame_id: str | None = None,
    standalone: bool = False,
    search: str | None = None,
    cidade: str | None = None,
    uf: str | None = None,
) -> list[Local]:
    q = db.query(Local)
    if certame_id:
        q = q.filter(Local.certame_id == certame_id)
    elif standalone:
        q = q.filter(Local.certame_id == None)  # noqa: E711
    if search:
        q = q.filter(Local.nome.ilike(f"%{search}%"))
    if cidade:
        q = q.filter(Local.cidade.ilike(f"%{cidade}%"))
    if uf:
        q = q.filter(Local.uf == uf.upper())
    return q.order_by(Local.nome).all()


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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(local, field, value)
    db.commit()
    db.refresh(local)
    return local


def vincular_certame(db: Session, local_id: str, certame_id: str | None) -> Local:
    local = buscar_local(db, local_id)
    local.certame_id = certame_id
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
    _recalc_local(db, data.local_id)
    db.refresh(sala)
    return sala


def atualizar_sala(db: Session, sala_id: str, data: SalaUpdate) -> Sala:
    sala = db.query(Sala).filter(Sala.id == sala_id).first()
    if not sala:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(sala, field, value)
    db.commit()
    _recalc_local(db, sala.local_id)
    db.refresh(sala)
    return sala


def deletar_sala(db: Session, sala_id: str) -> None:
    sala = db.query(Sala).filter(Sala.id == sala_id).first()
    if not sala:
        raise HTTPException(status_code=404, detail="Sala não encontrada")
    local_id = sala.local_id
    db.delete(sala)
    db.commit()
    _recalc_local(db, local_id)


def criar_salas_lote(db: Session, local_id: str, data: SalasBulkCreate) -> list[Sala]:
    local = db.query(Local).filter(Local.id == local_id).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado")
    salas = []
    for i in range(1, data.quantidade + 1):
        sala = Sala(
            local_id=local_id,
            numero=f"{data.prefixo} {str(i).zfill(2)}",
            capacidade=data.capacidade or 0,
            bloco=data.bloco,
            andar=data.andar,
            acessivel=False,
        )
        db.add(sala)
        salas.append(sala)
    db.commit()
    _recalc_local(db, local_id)
    for s in salas:
        db.refresh(s)
    return salas


def importar_salas(db: Session, local_id: str, conteudo: bytes, filename: str = "") -> list[Sala]:
    import io, pandas as pd, unicodedata, re

    local = db.query(Local).filter(Local.id == local_id).first()
    if not local:
        raise HTTPException(status_code=404, detail="Local não encontrado")

    def _norm(texto: str) -> str:
        s = unicodedata.normalize("NFD", str(texto))
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        s = re.sub(r"[^\w\s]", " ", s)
        return s.upper().strip()

    def _safe_str(val) -> str | None:
        s = str(val).strip()
        return None if s.lower() in ("nan", "none", "") else s

    def _safe_int(val) -> int:
        try:
            return 0 if pd.isna(val) else int(float(val))
        except Exception:
            return 0

    if filename.lower().endswith(".csv"):
        df = None
        for enc in ("utf-8", "latin-1"):
            for sep in (",", ";", "\t"):
                try:
                    candidate = pd.read_csv(io.BytesIO(conteudo), sep=sep, encoding=enc)
                    if len(candidate.columns) > 1:
                        df = candidate
                        break
                except Exception:
                    continue
            if df is not None:
                break
        if df is None:
            df = pd.read_csv(io.BytesIO(conteudo), encoding="latin-1")
    else:
        xl = pd.ExcelFile(io.BytesIO(conteudo))
        df = pd.read_excel(io.BytesIO(conteudo), sheet_name=xl.sheet_names[0])

    cols = {_norm(c): c for c in df.columns}
    col_num = cols.get("NUMERO", cols.get("SALA", cols.get("NOME", df.columns[0])))
    col_cap = cols.get("CAPACIDADE", cols.get("VAGAS", None))
    col_bloco = cols.get("BLOCO", None)
    col_andar = cols.get("ANDAR", None)
    col_acess = cols.get("ACESSIVEL", cols.get("ACESSIBILIDADE", None))

    salas = []
    for _, row in df.iterrows():
        numero = _safe_str(row[col_num])
        if not numero:
            continue

        acessivel = False
        if col_acess:
            val = _safe_str(row.get(col_acess, ""))
            if val:
                acessivel = val.upper() in ("SIM", "S", "TRUE", "1", "X")

        sala = Sala(
            local_id=local_id,
            numero=numero,
            capacidade=_safe_int(row.get(col_cap, 0)) if col_cap else 0,
            bloco=_safe_str(row.get(col_bloco, "")) if col_bloco else None,
            andar=_safe_str(row.get(col_andar, "")) if col_andar else None,
            acessivel=acessivel,
        )
        db.add(sala)
        salas.append(sala)

    db.commit()
    _recalc_local(db, local_id)
    for s in salas:
        db.refresh(s)
    return salas


def importar_locais_xlsx(db: Session, conteudo: bytes, certame_id: str | None = None) -> list[Local]:
    import io, pandas as pd, unicodedata, re

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

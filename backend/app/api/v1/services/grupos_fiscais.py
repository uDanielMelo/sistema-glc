import io
import pandas as pd
from datetime import date
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import GrupoFiscais, FiscalGrupo
from app.api.v1.schemas.grupos_fiscais import GrupoFiscaisCreate, GrupoFiscaisUpdate, FiscalGrupoCreate, FiscalGrupoUpdate

COLUNA_MAP = {
    'NOME': 'nome',
    'CPF': 'cpf',
    'NASCIMENTO': 'nascimento',
    'DATA DE NASCIMENTO': 'nascimento',
    'CELULAR': 'celular',
    'TELEFONE': 'celular',
    'FUNÇÃO': 'funcao',
    'FUNCAO': 'funcao',
    'PERÍODO': 'periodo',
    'PERIODO': 'periodo',
    'OBSERVAÇÃO': 'observacao',
    'OBSERVACAO': 'observacao',
    'OBS': 'observacao',
    'PAGAMENTO': 'pagamento',
}


def _parse_date(val) -> date | None:
    if val is None or (isinstance(val, float) and __import__('math').isnan(val)):
        return None
    if isinstance(val, date):
        return val
    s = str(val).strip()
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y'):
        try:
            return date.fromisoformat(s) if fmt == '%Y-%m-%d' else __import__('datetime').datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def listar_grupos(db: Session, certame_id: str) -> list[GrupoFiscais]:
    return db.query(GrupoFiscais).filter(GrupoFiscais.certame_id == certame_id).order_by(GrupoFiscais.criado_em).all()


def criar_grupo(db: Session, certame_id: str, data: GrupoFiscaisCreate) -> GrupoFiscais:
    grupo = GrupoFiscais(certame_id=certame_id, nome=data.nome)
    db.add(grupo)
    db.commit()
    db.refresh(grupo)
    return grupo


def atualizar_grupo(db: Session, certame_id: str, grupo_id: str, data: GrupoFiscaisUpdate) -> GrupoFiscais:
    grupo = db.query(GrupoFiscais).filter(GrupoFiscais.id == grupo_id, GrupoFiscais.certame_id == certame_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    grupo.nome = data.nome
    db.commit()
    db.refresh(grupo)
    return grupo


def deletar_grupo(db: Session, certame_id: str, grupo_id: str) -> None:
    grupo = db.query(GrupoFiscais).filter(GrupoFiscais.id == grupo_id, GrupoFiscais.certame_id == certame_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    db.delete(grupo)
    db.commit()


def adicionar_fiscal(db: Session, grupo_id: str, certame_id: str, data: FiscalGrupoCreate) -> FiscalGrupo:
    grupo = db.query(GrupoFiscais).filter(GrupoFiscais.id == grupo_id, GrupoFiscais.certame_id == certame_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")
    fiscal = FiscalGrupo(grupo_id=grupo_id, **data.model_dump())
    db.add(fiscal)
    db.commit()
    db.refresh(fiscal)
    return fiscal


def atualizar_fiscal(db: Session, grupo_id: str, fiscal_id: str, certame_id: str, data: FiscalGrupoUpdate) -> FiscalGrupo:
    fiscal = (
        db.query(FiscalGrupo)
        .join(GrupoFiscais)
        .filter(FiscalGrupo.id == fiscal_id, FiscalGrupo.grupo_id == grupo_id, GrupoFiscais.certame_id == certame_id)
        .first()
    )
    if not fiscal:
        raise HTTPException(status_code=404, detail="Fiscal não encontrado")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(fiscal, k, v)
    db.commit()
    db.refresh(fiscal)
    return fiscal


def deletar_fiscal(db: Session, grupo_id: str, fiscal_id: str, certame_id: str) -> None:
    fiscal = (
        db.query(FiscalGrupo)
        .join(GrupoFiscais)
        .filter(FiscalGrupo.id == fiscal_id, FiscalGrupo.grupo_id == grupo_id, GrupoFiscais.certame_id == certame_id)
        .first()
    )
    if not fiscal:
        raise HTTPException(status_code=404, detail="Fiscal não encontrado")
    db.delete(fiscal)
    db.commit()


def importar_fiscais(db: Session, grupo_id: str, certame_id: str, conteudo: bytes, filename: str) -> int:
    grupo = db.query(GrupoFiscais).filter(GrupoFiscais.id == grupo_id, GrupoFiscais.certame_id == certame_id).first()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo não encontrado")

    ext = filename.rsplit('.', 1)[-1].lower()
    try:
        if ext == 'csv':
            for enc in ('utf-8-sig', 'latin-1', 'cp1252'):
                try:
                    df = pd.read_csv(io.BytesIO(conteudo), encoding=enc, dtype=str)
                    break
                except UnicodeDecodeError:
                    continue
        else:
            df = pd.read_excel(io.BytesIO(conteudo), dtype=str)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erro ao ler arquivo: {e}")

    df.columns = [str(c).strip().upper() for c in df.columns]
    mapa = {col: COLUNA_MAP[col] for col in df.columns if col in COLUNA_MAP}

    if 'NOME' not in mapa.values() and 'nome' not in mapa.values():
        raise HTTPException(status_code=422, detail="A coluna NOME é obrigatória na planilha")

    novos = []
    for _, row in df.iterrows():
        kwargs: dict = {}
        for col, campo in mapa.items():
            val = row.get(col)
            if pd.isna(val) if hasattr(pd, 'isna') else val != val:
                kwargs[campo] = None
            elif campo == 'nascimento':
                kwargs[campo] = _parse_date(val)
            else:
                kwargs[campo] = str(val).strip() or None

        nome = kwargs.get('nome')
        if not nome:
            continue
        novos.append(FiscalGrupo(grupo_id=grupo_id, **kwargs))

    db.bulk_save_objects(novos)
    db.commit()
    return len(novos)

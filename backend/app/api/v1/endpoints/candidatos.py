import unicodedata
import pandas as pd
from io import BytesIO
from datetime import date, datetime
from typing import Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.db.session import get_db
from app.core.deps import get_current_user, require_logistica
from app.models.models import CandidatoCertame, Certame, LocalAplicacaoInfo, Usuario

router = APIRouter()

COLUNA_MAP = {
    'INSCRICAO': 'numero_inscricao',
    'NOME': 'nome',
    'CPF': 'cpf',
    'VAGA': 'vaga',
    'DIA DA PROVA': 'dia_prova',
    'HORARIO': 'horario',
    'LOCAL': 'local_nome',
    'SALA': 'sala',
    'CONDICAO ESPECIAL': 'condicao_especial',
    'CONDICAO': 'condicao_especial',
}


def _norm(texto: str) -> str:
    nfkd = unicodedata.normalize('NFKD', str(texto).strip().upper())
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def _parse_data(val: str) -> Optional[date]:
    if not val or val in ('nan', 'None', 'NaT', ''):
        return None
    val = str(val).strip()
    for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


def _processar_arquivo(content: bytes, filename: str) -> list[dict]:
    buf = BytesIO(content)
    try:
        if filename.lower().endswith('.csv'):
            for enc in ('utf-8-sig', 'latin-1', 'cp1252'):
                try:
                    buf.seek(0)
                    df = pd.read_csv(buf, dtype=str, encoding=enc)
                    break
                except (UnicodeDecodeError, Exception):
                    continue
            else:
                raise HTTPException(400, "Não foi possível ler o arquivo CSV")
        else:
            df = pd.read_excel(buf, dtype=str, engine='openpyxl')
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Erro ao ler arquivo: {e}")

    rename_map = {}
    for col in df.columns:
        norm = _norm(str(col))
        if norm in COLUNA_MAP:
            rename_map[col] = COLUNA_MAP[norm]

    if 'nome' not in rename_map.values():
        raise HTTPException(400, "Coluna NOME não encontrada no arquivo")

    df = df.rename(columns=rename_map)

    campos = ['numero_inscricao', 'nome', 'cpf', 'vaga', 'horario', 'local_nome', 'sala', 'condicao_especial']
    registros = []
    for _, row in df.iterrows():
        nome = str(row.get('nome', '')).strip()
        if not nome or nome in ('nan', 'None', ''):
            continue
        rec: dict = {'nome': nome}
        for campo in campos:
            if campo == 'nome':
                continue
            if campo in df.columns:
                v = str(row.get(campo, '')).strip()
                rec[campo] = v if v and v not in ('nan', 'None', '') else None
            else:
                rec[campo] = None
        rec['dia_prova'] = _parse_data(str(row.get('dia_prova', ''))) if 'dia_prova' in df.columns else None
        registros.append(rec)

    return registros


def _get_certame(db: Session, certame_id: str, tenant_id: str) -> Certame:
    c = db.query(Certame).filter(Certame.id == certame_id, Certame.tenant_id == tenant_id).first()
    if not c:
        raise HTTPException(404, "Certame não encontrado")
    return c


def _to_dict(c: CandidatoCertame) -> dict:
    return {
        "id": c.id,
        "numero_inscricao": c.numero_inscricao,
        "nome": c.nome,
        "cpf": c.cpf,
        "vaga": c.vaga,
        "dia_prova": c.dia_prova.isoformat() if c.dia_prova else None,
        "horario": c.horario,
        "local_nome": c.local_nome,
        "sala": c.sala,
        "condicao_especial": c.condicao_especial,
    }


@router.get("/{certame_id}/candidatos/info")
def info(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    total = db.query(func.count(CandidatoCertame.id)).filter(
        CandidatoCertame.certame_id == certame_id
    ).scalar() or 0
    com_condicao = db.query(func.count(CandidatoCertame.id)).filter(
        CandidatoCertame.certame_id == certame_id,
        CandidatoCertame.condicao_especial.isnot(None),
        CandidatoCertame.condicao_especial != '',
    ).scalar() or 0
    if total == 0:
        return {"importado": False, "total": 0, "com_condicao": 0, "importado_em": None}
    primeiro = db.query(CandidatoCertame.importado_em).filter(
        CandidatoCertame.certame_id == certame_id
    ).first()
    return {
        "importado": True,
        "total": total,
        "com_condicao": com_condicao,
        "importado_em": primeiro[0].isoformat() if primeiro and primeiro[0] else None,
    }


@router.post("/{certame_id}/candidatos/importar", status_code=201)
async def importar(
    certame_id: str,
    arquivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    content = await arquivo.read()
    registros = _processar_arquivo(content, arquivo.filename or 'arquivo.xlsx')
    if not registros:
        raise HTTPException(400, "Nenhum candidato válido encontrado no arquivo")
    db.query(CandidatoCertame).filter(CandidatoCertame.certame_id == certame_id).delete()
    agora = datetime.utcnow()
    for rec in registros:
        db.add(CandidatoCertame(certame_id=certame_id, importado_em=agora, **rec))
    db.commit()
    return {"total": len(registros)}


@router.get("/{certame_id}/candidatos/locais")
def locais_aplicacao(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    todos = db.query(CandidatoCertame).filter(
        CandidatoCertame.certame_id == certame_id
    ).order_by(CandidatoCertame.local_nome, CandidatoCertame.sala, CandidatoCertame.numero_inscricao).all()

    # group local -> (dia_prova, horario) -> sala -> candidatos
    locais_dict: dict = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))
    for c in todos:
        local = c.local_nome or '(sem local)'
        periodo = (str(c.dia_prova) if c.dia_prova else None, c.horario)
        sala = c.sala or '(sem sala)'
        locais_dict[local][periodo][sala].append(c)

    result = []
    for local_nome in sorted(locais_dict.keys()):
        periodos_data = locais_dict[local_nome]
        periodos_list = []
        total_local = 0
        tem_condicao_local = False
        salas_unicas: set = set()

        for (dia, horario) in sorted(periodos_data.keys(), key=lambda k: (k[0] or '', k[1] or '')):
            salas_data = periodos_data[(dia, horario)]
            salas_list = []
            total_periodo = 0
            tem_condicao_periodo = False

            for sala_nome in sorted(salas_data.keys()):
                cands = salas_data[sala_nome]
                tem_condicao_sala = any(c.condicao_especial for c in cands)
                cargos = sorted({c.vaga for c in cands if c.vaga})
                salas_list.append({
                    "sala": sala_nome,
                    "total": len(cands),
                    "cargos": cargos,
                    "tem_condicao": tem_condicao_sala,
                })
                total_periodo += len(cands)
                salas_unicas.add(sala_nome)
                if tem_condicao_sala:
                    tem_condicao_periodo = True

            periodos_list.append({
                "dia_prova": dia,
                "horario": horario,
                "total": total_periodo,
                "tem_condicao": tem_condicao_periodo,
                "salas": salas_list,
            })
            total_local += total_periodo
            if tem_condicao_periodo:
                tem_condicao_local = True

        result.append({
            "local_nome": local_nome,
            "total_salas": len(salas_unicas),
            "total_candidatos": total_local,
            "tem_condicao": tem_condicao_local,
            "periodos": periodos_list,
        })
    return result


@router.get("/{certame_id}/candidatos/periodos-aplicacao")
def periodos_aplicacao(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    todos = db.query(CandidatoCertame).filter(
        CandidatoCertame.certame_id == certame_id,
        CandidatoCertame.dia_prova.isnot(None),
    ).all()

    grupos: dict = defaultdict(lambda: {"horarios": set(), "cargos": set(), "locais": set(), "total": 0})
    for c in todos:
        key = c.dia_prova.isoformat()
        if c.horario:
            grupos[key]["horarios"].add(c.horario)
        if c.vaga:
            grupos[key]["cargos"].add(c.vaga)
        if c.local_nome:
            grupos[key]["locais"].add(c.local_nome)
        grupos[key]["total"] += 1

    return [
        {
            "dia_prova": dia,
            "horarios": sorted(grupos[dia]["horarios"]),
            "cargos": sorted(grupos[dia]["cargos"]),
            "locais": sorted(grupos[dia]["locais"]),
            "total": grupos[dia]["total"],
        }
        for dia in sorted(grupos.keys())
    ]


@router.get("/{certame_id}/candidatos")
def listar(
    certame_id: str,
    local: Optional[str] = None,
    sala: Optional[str] = None,
    dia: Optional[str] = None,
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    q = db.query(CandidatoCertame).filter(CandidatoCertame.certame_id == certame_id)
    if local:
        q = q.filter(CandidatoCertame.local_nome == local)
    if sala:
        q = q.filter(CandidatoCertame.sala == sala)
    if dia:
        try:
            q = q.filter(CandidatoCertame.dia_prova == date.fromisoformat(dia))
        except ValueError:
            pass
    if busca:
        termo = f"%{busca.upper()}%"
        q = q.filter(
            (func.upper(CandidatoCertame.nome).like(termo)) |
            (CandidatoCertame.numero_inscricao.like(termo))
        )
    q = q.order_by(CandidatoCertame.local_nome, CandidatoCertame.sala, CandidatoCertame.numero_inscricao)
    return [_to_dict(c) for c in q.all()]


class EditarCandidato(BaseModel):
    condicao_especial: Optional[str] = None


class ResponsavelSchema(BaseModel):
    nome: str = ''
    contato: str = ''
    obs: str = ''


class LocalInfoUpsert(BaseModel):
    local_nome: str
    responsaveis: list[ResponsavelSchema] = []
    colaboradores_ids: list[str] = []
    grupo_fiscais_id: Optional[str] = None


@router.patch("/{certame_id}/candidatos/{candidato_id}")
def editar(
    certame_id: str,
    candidato_id: str,
    data: EditarCandidato,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    c = db.query(CandidatoCertame).filter(
        CandidatoCertame.id == candidato_id,
        CandidatoCertame.certame_id == certame_id,
    ).first()
    if not c:
        raise HTTPException(404, "Candidato não encontrado")
    c.condicao_especial = data.condicao_especial.strip() if data.condicao_especial else None
    db.commit()
    return _to_dict(c)


@router.get("/{certame_id}/locais-info")
def listar_locais_info(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    return [
        {
            "local_nome": li.local_nome,
            "responsaveis": li.responsaveis or [],
            "colaboradores_ids": li.colaboradores_ids or [],
            "grupo_fiscais_id": li.grupo_fiscais_id,
        }
        for li in db.query(LocalAplicacaoInfo).filter(
            LocalAplicacaoInfo.certame_id == certame_id
        ).all()
    ]


@router.post("/{certame_id}/locais-info")
def salvar_local_info(
    certame_id: str,
    data: LocalInfoUpsert,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    li = db.query(LocalAplicacaoInfo).filter(
        LocalAplicacaoInfo.certame_id == certame_id,
        LocalAplicacaoInfo.local_nome == data.local_nome,
    ).first()
    responsaveis = [r.model_dump() for r in data.responsaveis]
    colaboradores_ids = data.colaboradores_ids
    if li:
        li.responsaveis = responsaveis
        li.colaboradores_ids = colaboradores_ids
        li.grupo_fiscais_id = data.grupo_fiscais_id
    else:
        li = LocalAplicacaoInfo(
            certame_id=certame_id,
            local_nome=data.local_nome,
            responsaveis=responsaveis,
            colaboradores_ids=colaboradores_ids,
            grupo_fiscais_id=data.grupo_fiscais_id,
        )
        db.add(li)
    db.commit()
    db.refresh(li)
    return {
        "local_nome": li.local_nome,
        "responsaveis": li.responsaveis or [],
        "colaboradores_ids": li.colaboradores_ids or [],
        "grupo_fiscais_id": li.grupo_fiscais_id,
    }


@router.delete("/{certame_id}/candidatos", status_code=204)
def remover_todos(
    certame_id: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_logistica),
):
    _get_certame(db, certame_id, current_user.tenant_id)
    db.query(CandidatoCertame).filter(CandidatoCertame.certame_id == certame_id).delete()
    db.commit()

import secrets
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException
from app.models.models import Coordenador, CertameColaborador, Certame, ColaboradorStatus
from app.api.v1.schemas.colaboradores import (
    ColaboradorPreCadastro, ColaboradorCompletarCadastro,
    ColaboradorLogin, VincularCertame,
)
from app.core.security import hash_password, verify_password, create_access_token

TOKEN_EXPIRY_DAYS = 7

_CAMPOS_PESSOAIS = [
    'email', 'data_nascimento', 'rg', 'cep', 'endereco', 'numero',
    'complemento', 'bairro', 'cidade', 'estado',
    'chave_pix', 'tipo_chave_pix', 'banco', 'agencia', 'conta',
]


def _carregar_colaboradores(db: Session):
    return (
        db.query(Coordenador)
        .options(
            joinedload(Coordenador.certames_vinculados)
            .joinedload(CertameColaborador.certame)
        )
        .order_by(Coordenador.nome)
        .all()
    )


def pre_cadastrar_colaborador(db: Session, data: ColaboradorPreCadastro) -> Coordenador:
    cpf_limpo = data.cpf.replace('.', '').replace('-', '').strip()
    existing = db.query(Coordenador).filter(
        Coordenador.cpf.in_([data.cpf, cpf_limpo])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="CPF já cadastrado")

    colab = Coordenador(
        nome=data.nome,
        cpf=data.cpf,
        celular=data.celular,
        token_convite=secrets.token_urlsafe(32),
        token_expiry=datetime.utcnow() + timedelta(days=TOKEN_EXPIRY_DAYS),
        status=ColaboradorStatus.pendente,
    )
    db.add(colab)
    db.commit()
    db.refresh(colab)
    return colab


def verificar_convite(db: Session, token: str) -> Coordenador:
    colab = db.query(Coordenador).filter(Coordenador.token_convite == token).first()
    if not colab:
        raise HTTPException(status_code=404, detail="Convite inválido ou já utilizado")
    if colab.token_expiry and colab.token_expiry < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Convite expirado. Solicite um novo ao administrador.")
    return colab


def completar_cadastro(db: Session, token: str, data: ColaboradorCompletarCadastro) -> Coordenador:
    colab = verificar_convite(db, token)

    colab.senha_hash = hash_password(data.senha)
    colab.status = ColaboradorStatus.ativo
    colab.token_convite = None
    colab.token_expiry = None

    for campo in _CAMPOS_PESSOAIS:
        valor = getattr(data, campo, None)
        if valor is not None:
            setattr(colab, campo, valor)

    db.commit()
    db.refresh(colab)
    return colab


def login_colaborador(db: Session, data: ColaboradorLogin) -> dict:
    cpf_limpo = data.cpf.replace('.', '').replace('-', '').strip()
    colab = db.query(Coordenador).filter(
        Coordenador.cpf.in_([data.cpf, cpf_limpo])
    ).first()

    if not colab or not colab.senha_hash:
        raise HTTPException(status_code=401, detail="CPF ou senha inválidos")
    if colab.status == ColaboradorStatus.inativo:
        raise HTTPException(status_code=403, detail="Colaborador inativo. Entre em contato com o administrador.")
    if not verify_password(data.senha, colab.senha_hash):
        raise HTTPException(status_code=401, detail="CPF ou senha inválidos")

    token = create_access_token({"sub": colab.id, "type": "colaborador"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "colaborador_id": colab.id,
        "nome": colab.nome,
    }


def listar_colaboradores(db: Session) -> list:
    return _carregar_colaboradores(db)


def obter_colaborador(db: Session, colab_id: str) -> Coordenador:
    colab = db.query(Coordenador).filter(Coordenador.id == colab_id).first()
    if not colab:
        raise HTTPException(status_code=404, detail="Colaborador não encontrado")
    return colab


def deletar_colaborador(db: Session, colab_id: str) -> None:
    colab = obter_colaborador(db, colab_id)
    db.delete(colab)
    db.commit()


def regenerar_convite(db: Session, colab_id: str) -> Coordenador:
    colab = obter_colaborador(db, colab_id)
    if colab.status == ColaboradorStatus.ativo:
        raise HTTPException(status_code=400, detail="Colaborador já completou o cadastro")
    colab.token_convite = secrets.token_urlsafe(32)
    colab.token_expiry = datetime.utcnow() + timedelta(days=TOKEN_EXPIRY_DAYS)
    colab.status = ColaboradorStatus.pendente
    db.commit()
    db.refresh(colab)
    return colab


def vincular_certame(db: Session, colab_id: str, data: VincularCertame) -> CertameColaborador:
    obter_colaborador(db, colab_id)

    certame = db.query(Certame).filter(Certame.id == data.certame_id).first()
    if not certame:
        raise HTTPException(status_code=404, detail="Certame não encontrado")

    existing = db.query(CertameColaborador).filter(
        CertameColaborador.certame_id == data.certame_id,
        CertameColaborador.coordenador_id == colab_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Colaborador já vinculado a este certame")

    vinculo = CertameColaborador(
        certame_id=data.certame_id,
        coordenador_id=colab_id,
        funcao=data.funcao,
    )
    db.add(vinculo)
    db.commit()
    db.refresh(vinculo)
    return vinculo


def desvincular_certame(db: Session, colab_id: str, certame_id: str) -> None:
    vinculo = db.query(CertameColaborador).filter(
        CertameColaborador.certame_id == certame_id,
        CertameColaborador.coordenador_id == colab_id,
    ).first()
    if not vinculo:
        raise HTTPException(status_code=404, detail="Vínculo não encontrado")
    db.delete(vinculo)
    db.commit()


def listar_certames_colaborador(db: Session, colab_id: str) -> list:
    return (
        db.query(CertameColaborador)
        .options(joinedload(CertameColaborador.certame))
        .filter(CertameColaborador.coordenador_id == colab_id)
        .all()
    )

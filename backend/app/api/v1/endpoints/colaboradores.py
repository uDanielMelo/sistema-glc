from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import require_logistica, get_current_colaborador
from app.models.models import Coordenador, CertameColaborador, Usuario
from app.api.v1.schemas.colaboradores import (
    ColaboradorPreCadastro, ColaboradorCompletarCadastro, ColaboradorLogin,
    ColaboradorTokenResponse, ConviteInfo, ColaboradorAdminResponse,
    CertameSimples, VincularCertame, ColaboradorPortalPerfil,
)
from app.api.v1.services.colaboradores import (
    pre_cadastrar_colaborador, verificar_convite, completar_cadastro,
    login_colaborador, listar_colaboradores, obter_colaborador,
    deletar_colaborador, regenerar_convite, vincular_certame,
    desvincular_certame, listar_certames_colaborador,
)

router = APIRouter()


def _to_admin_response(colab: Coordenador) -> ColaboradorAdminResponse:
    certames = [
        CertameSimples(
            id=v.id,
            certame_id=v.certame_id,
            titulo=v.certame.titulo,
            orgao=v.certame.orgao,
            funcao=v.funcao,
        )
        for v in colab.certames_vinculados
    ]
    return ColaboradorAdminResponse(
        id=colab.id,
        nome=colab.nome,
        cpf=colab.cpf,
        celular=colab.celular,
        email=colab.email,
        status=colab.status.value,
        token_convite=colab.token_convite,
        token_expiry=colab.token_expiry,
        criado_em=colab.criado_em,
        certames=certames,
    )


# ── Rotas públicas ────────────────────────────────────────────────────────────

@router.get("/colaboradores/convite/{token}", response_model=ConviteInfo, tags=["portal-colaborador"])
def get_convite(token: str, db: Session = Depends(get_db)):
    return verificar_convite(db, token)


@router.post("/colaboradores/completar-cadastro/{token}", response_model=ConviteInfo, tags=["portal-colaborador"])
def post_completar_cadastro(
    token: str,
    data: ColaboradorCompletarCadastro,
    db: Session = Depends(get_db),
):
    return completar_cadastro(db, token, data)


@router.post("/colaboradores/login", response_model=ColaboradorTokenResponse, tags=["portal-colaborador"])
def post_login_colaborador(data: ColaboradorLogin, db: Session = Depends(get_db)):
    return login_colaborador(db, data)


# ── Rotas portal (token de colaborador) ──────────────────────────────────────

@router.get("/colaboradores/portal/perfil", response_model=ColaboradorPortalPerfil, tags=["portal-colaborador"])
def get_portal_perfil(current: Coordenador = Depends(get_current_colaborador)):
    return current


@router.get("/colaboradores/portal/certames", tags=["portal-colaborador"])
def get_portal_certames(
    db: Session = Depends(get_db),
    current: Coordenador = Depends(get_current_colaborador),
):
    vinculos = listar_certames_colaborador(db, current.id)
    return [
        {
            "id": v.id,
            "certame_id": v.certame_id,
            "titulo": v.certame.titulo,
            "orgao": v.certame.orgao,
            "data_aplicacao": v.certame.data_aplicacao,
            "status": v.certame.status.value,
            "funcao": v.funcao,
        }
        for v in vinculos
    ]


# ── Rotas admin ───────────────────────────────────────────────────────────────

@router.get("/colaboradores", response_model=list[ColaboradorAdminResponse], tags=["colaboradores"])
def get_colaboradores(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    return [_to_admin_response(c) for c in listar_colaboradores(db)]


@router.post("/colaboradores/pre-cadastro", response_model=ColaboradorAdminResponse, status_code=201, tags=["colaboradores"])
def post_pre_cadastro(
    data: ColaboradorPreCadastro,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    colab = pre_cadastrar_colaborador(db, data)
    return _to_admin_response(colab)


@router.delete("/colaboradores/{colab_id}", status_code=204, tags=["colaboradores"])
def delete_colaborador(
    colab_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    deletar_colaborador(db, colab_id)


@router.post("/colaboradores/{colab_id}/reenviar-convite", response_model=ColaboradorAdminResponse, tags=["colaboradores"])
def post_reenviar_convite(
    colab_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    colab = regenerar_convite(db, colab_id)
    return _to_admin_response(colab)


@router.post("/colaboradores/{colab_id}/vincular-certame", status_code=201, tags=["colaboradores"])
def post_vincular_certame(
    colab_id: str,
    data: VincularCertame,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    v = vincular_certame(db, colab_id, data)
    return CertameSimples(
        id=v.id,
        certame_id=v.certame_id,
        titulo=v.certame.titulo,
        orgao=v.certame.orgao,
        funcao=v.funcao,
    )


@router.get("/certames/{certame_id}/equipe", tags=["colaboradores"])
def get_equipe_certame(
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    vinculos = db.query(CertameColaborador).filter(
        CertameColaborador.certame_id == certame_id
    ).all()
    return [
        {
            "id": v.id,
            "certame_id": v.certame_id,
            "colaborador_id": v.coordenador_id,
            "funcao": v.funcao,
            "nome": v.colaborador.nome,
            "cpf": v.colaborador.cpf,
            "celular": v.colaborador.celular,
            "email": v.colaborador.email,
            "status": v.colaborador.status.value,
        }
        for v in vinculos
    ]


@router.delete("/colaboradores/{colab_id}/certames/{certame_id}", status_code=204, tags=["colaboradores"])
def delete_vinculo_certame(
    colab_id: str,
    certame_id: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_logistica),
):
    desvincular_certame(db, colab_id, certame_id)

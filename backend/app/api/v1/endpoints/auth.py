from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.schemas.auth import (
    TokenResponse, UsuarioCreate, UsuarioUpdate,
    UsuarioResponse, ChangePasswordRequest
)
from app.api.v1.services.auth import (
    authenticate_user, create_token_for_user,
    create_usuario, update_usuario, change_password
)
from app.core.deps import get_current_user, require_admin
from app.models.models import Usuario

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate_user(db, form.username, form.password)
    token = create_token_for_user(user)
    return TokenResponse(access_token=token, user=UsuarioResponse.model_validate(user))


@router.get("/me", response_model=UsuarioResponse)
def me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.post("/usuarios", response_model=UsuarioResponse)
def criar_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return create_usuario(db, data)


@router.put("/usuarios/{user_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    user_id: str,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_admin),
):
    return update_usuario(db, user_id, data)


@router.get("/usuarios", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_admin),
):
    return db.query(Usuario).filter(Usuario.tenant_id == current_user.tenant_id).all()


@router.post("/alterar-senha")
def alterar_senha(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    change_password(db, current_user, data.senha_atual, data.nova_senha)
    return {"message": "Senha alterada com sucesso"}
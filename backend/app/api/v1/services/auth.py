from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import Usuario, Tenant
from app.core.security import verify_password, hash_password, create_access_token
from app.api.v1.schemas.auth import UsuarioCreate, UsuarioUpdate


def authenticate_user(db: Session, email: str, password: str) -> Usuario:
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user or not verify_password(password, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )
    return user


def create_token_for_user(user: Usuario) -> str:
    return create_access_token(data={"sub": user.id, "role": user.role, "tenant": user.tenant_id})


def create_usuario(db: Session, data: UsuarioCreate) -> Usuario:
    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant não encontrado")

    existing = db.query(Usuario).filter(Usuario.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    user = Usuario(
        tenant_id=data.tenant_id,
        nome=data.nome,
        email=data.email,
        senha_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_usuario(db: Session, user_id: str, data: UsuarioUpdate) -> Usuario:
    user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: Usuario, senha_atual: str, nova_senha: str) -> None:
    if not verify_password(senha_atual, user.senha_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    user.senha_hash = hash_password(nova_senha)
    db.commit()
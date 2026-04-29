from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.models import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UsuarioResponse"


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.logistica
    tenant_id: str


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    ativo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: str
    nome: str
    email: str
    role: UserRole
    ativo: bool
    tenant_id: str

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    senha_atual: str
    nova_senha: str


TokenResponse.model_rebuild()
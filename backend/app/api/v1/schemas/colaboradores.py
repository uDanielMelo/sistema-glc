from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class ColaboradorPreCadastro(BaseModel):
    nome: str
    cpf: str
    celular: str


class ColaboradorCompletarCadastro(BaseModel):
    senha: str
    email: Optional[str] = None
    data_nascimento: Optional[str] = None
    rg: Optional[str] = None
    cep: Optional[str] = None
    endereco: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    chave_pix: Optional[str] = None
    tipo_chave_pix: Optional[str] = None
    banco: Optional[str] = None
    agencia: Optional[str] = None
    conta: Optional[str] = None


class ColaboradorLogin(BaseModel):
    cpf: str
    senha: str


class ColaboradorTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    colaborador_id: str
    nome: str


class ConviteInfo(BaseModel):
    nome: str
    cpf: str
    status: str

    class Config:
        from_attributes = True


class CertameSimples(BaseModel):
    id: str
    certame_id: str
    titulo: str
    orgao: Optional[str] = None
    funcao: Optional[str] = None


class ColaboradorAdminResponse(BaseModel):
    id: str
    nome: str
    cpf: Optional[str] = None
    celular: Optional[str] = None
    email: Optional[str] = None
    status: str
    token_convite: Optional[str] = None
    token_expiry: Optional[datetime] = None
    criado_em: datetime
    certames: List[CertameSimples] = []

    class Config:
        from_attributes = True


class VincularCertame(BaseModel):
    certame_id: str
    funcao: Optional[str] = None


class ColaboradorPortalPerfil(BaseModel):
    id: str
    nome: str
    cpf: Optional[str] = None
    celular: Optional[str] = None
    email: Optional[str] = None
    status: str

    class Config:
        from_attributes = True

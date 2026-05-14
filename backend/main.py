from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.certames import router as certames_router
from app.api.v1.endpoints.periodos import router as periodos_router
from app.api.v1.endpoints.locais import router as locais_router
from app.api.v1.endpoints.equipes import router as equipes_router
from app.api.v1.endpoints.colaboradores import router as colaboradores_router
from app.api.v1.endpoints.arquivos import router as arquivos_router
from app.api.v1.endpoints.candidatos import router as candidatos_router
from app.api.v1.endpoints.grupos_fiscais import router as grupos_fiscais_router
from app.api.v1.endpoints.ocorrencias import router as ocorrencias_router
from app.api.v1.endpoints.agenda import router as agenda_router

app = FastAPI(
    title="GLC — Gestão e Logística de Certames",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(certames_router, prefix="/api/v1/certames", tags=["certames"])
app.include_router(periodos_router, prefix="/api/v1", tags=["periodos"])
app.include_router(locais_router, prefix="/api/v1", tags=["locais"])
app.include_router(equipes_router, prefix="/api/v1", tags=["equipes"])
app.include_router(colaboradores_router, prefix="/api/v1")
app.include_router(arquivos_router, prefix="/api/v1/certames", tags=["arquivos"])
app.include_router(candidatos_router, prefix="/api/v1/certames", tags=["candidatos"])
app.include_router(grupos_fiscais_router, prefix="/api/v1/certames", tags=["grupos-fiscais"])
app.include_router(ocorrencias_router, prefix="/api/v1/certames", tags=["ocorrencias"])
app.include_router(agenda_router, prefix="/api/v1/certames", tags=["agenda"])
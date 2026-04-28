from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

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


# Rotas serão registradas aqui conforme os módulos forem desenvolvidos
# from app.api.v1.endpoints import auth, certames, locais, fiscais, ocorrencias
# app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
# app.include_router(certames.router, prefix="/api/v1/certames", tags=["certames"])

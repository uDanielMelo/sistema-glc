from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.certames import router as certames_router

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
"""
Recria o banco do zero e popula com os dados iniciais.
Use quando o banco for perdido ou precisar de reset completo.

Execução:
    python reset_db.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text
from app.db.session import engine, SessionLocal
from app.models.models import (
    Tenant, Usuario, UserRole,
)
from app.core.security import hash_password
import subprocess


def drop_all_tables(conn):
    conn.execute(text("DROP SCHEMA public CASCADE"))
    conn.execute(text("CREATE SCHEMA public"))
    conn.execute(text("GRANT ALL ON SCHEMA public TO PUBLIC"))
    conn.commit()
    print("Schema público recriado.")


def run_migrations():
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=os.path.dirname(__file__),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print("ERRO na migration:")
        print(result.stderr)
        sys.exit(1)
    print("Migrations aplicadas.")


def seed():
    db = SessionLocal()
    try:
        tenant = Tenant(nome="Banca GLC", slug="default")
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
        print(f"Tenant criado: {tenant.nome}")

        admin = Usuario(
            tenant_id=tenant.id,
            nome="Administrador",
            email="admin@glc.com",
            senha_hash=hash_password("admin123"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print("Admin criado — email: admin@glc.com / senha: admin123")
    finally:
        db.close()


if __name__ == "__main__":
    with engine.connect() as conn:
        drop_all_tables(conn)
    run_migrations()
    seed()
    print("\nBanco recriado com sucesso!")

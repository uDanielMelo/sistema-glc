"""
Script de seed — cria o tenant inicial e o usuário admin.
Rode uma vez após as migrations:
    python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.models.models import Tenant, Usuario, UserRole
from app.core.security import hash_password


def seed():
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.slug == "default").first()
        if not tenant:
            tenant = Tenant(nome="Banca GLC", slug="default")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)
            print(f"Tenant criado: {tenant.nome} ({tenant.id})")
        else:
            print(f"Tenant já existe: {tenant.nome}")

        admin = db.query(Usuario).filter(Usuario.email == "admin@glc.com").first()
        if not admin:
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
            print("IMPORTANTE: troque a senha após o primeiro login!")
        else:
            print("Admin já existe")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
# GLC — Gestão e Logística de Certames

Sistema de gestão e logística para aplicação de concursos públicos e processos seletivos.

## Visão geral

O GLC atua como sistema de apoio a bancas que utilizam plataformas de gestão de concursos.
Importa dados exportados dessas plataformas e centraliza o planejamento e a execução logística do certame.

### Fases do certame no GLC

**Pré-aplicação**
- Cadastro do certame e importação de dados
- Divisão de cargos por períodos de aplicação
- Cadastro e gestão de locais de prova
- Alocação de equipes e fiscais
- Candidatos com condições especiais

**Durante a aplicação**
- Dashboard do coordenador (mobile-first)
- Lista de presença de fiscais
- Registro de ocorrências (sala + candidato + descrição)

**Pós-aplicação**
- Relatórios consolidados por certame

## Perfis de acesso

| Perfil | Acesso |
|--------|--------|
| `admin` | Acesso total — configurações, usuários, todos os certames |
| `logistica` | CRUD de certames, locais, equipes, relatórios |
| `coordenador` | Visualização do dashboard do seu local + envio de ocorrências e presença |

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Python 3.12 + FastAPI |
| Banco de dados | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 + Alembic |
| Autenticação | JWT (python-jose) |
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS |
| Estado global | Zustand |
| HTTP client | Axios |
| Hospedagem | Railway (backend + banco) |
| Versionamento | GitHub (monorepo) |

## Estrutura do repositório

```
glc/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Rotas por domínio
│   │   ├── core/               # Config, segurança, dependências
│   │   ├── db/                 # Session, base declarativa
│   │   ├── models/             # Modelos SQLAlchemy
│   │   ├── schemas/            # Schemas Pydantic
│   │   ├── services/           # Lógica de negócio
│   │   └── utils/              # Helpers (importação, etc)
│   ├── alembic/                # Migrations
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/         # UI, layout, formulários
│   │   ├── pages/              # Páginas por rota
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # Chamadas à API
│   │   ├── store/              # Estado global (Zustand)
│   │   ├── types/              # Tipos TypeScript
│   │   └── utils/
│   ├── public/
│   └── package.json
├── docs/
│   ├── modelo-dados.md
│   ├── fluxos.md
│   └── importacao.md
├── .github/workflows/
│   └── ci.yml
├── .gitignore
└── README.md
```

## Preparado para SaaS

O modelo de dados inclui a entidade `Tenant` desde o início.
Toda query é escopada por `tenant_id`, permitindo isolar dados de múltiplas bancas
sem alterações estruturais quando o produto escalar.

## Desenvolvimento local

### Pré-requisitos
- Python 3.12+
- Node.js 20+
- PostgreSQL 16+ rodando localmente

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # editar com suas credenciais locais
alembic upgrade head      # criar tabelas
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

API disponível em `http://localhost:8000`  
Frontend disponível em `http://localhost:5173`  
Documentação automática em `http://localhost:8000/docs`

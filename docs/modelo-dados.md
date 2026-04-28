# Modelo de dados — GLC

## Entidades e relacionamentos

```
Tenant (banca)
└── Certame
    ├── Periodo (1, 2, 3...)
    │   └── Cargo ──────────────── Candidato
    ├── Local
    │   ├── Sala
    │   ├── Fiscal
    │   └── Coordenador (→ Usuario)
    ├── Ocorrencia (local + sala + candidato + registrado_por)
    └── Importacao (log de cada planilha importada)
```

## Decisões de design

### Multi-tenant desde o início
Toda entidade principal tem `tenant_id`. Queries sempre filtradas por tenant.
Quando escalar para SaaS, basta criar novos Tenants — zero alteração estrutural.

### UUID como PK
Evita colisão entre tenants e facilita eventual particionamento.

### Ocorrência flexível
`local_id`, `sala_id` e `candidato_id` são todos opcionais.
Uma ocorrência pode ser sobre o local em geral, uma sala específica,
ou um candidato específico em uma sala.

### Fiscal vs Coordenador
- **Coordenador**: é um `Usuario` com role `coordenador`, vinculado a um `Local`
- **Fiscal**: entidade própria com nome e celular, sem acesso ao sistema.
  Sua presença é confirmada pelo coordenador via portal.

### Condições especiais do candidato
Campo `JSON` em `Candidato.condicoes_especiais` armazena lista de strings:
`["cadeirante", "lactante", "gestante", "idoso", "baixa_visao", ...]`
Flexível para novos tipos sem migration.

## Tipos de importação

| Tipo | Dados esperados |
|------|----------------|
| `candidatos` | inscrição, nome, CPF, cargo, local, sala |
| `locais` | código, nome, endereço, salas, capacidade |
| `equipes` | nome, celular, observação, local vinculado |
| `condicoes_especiais` | inscrição, tipo de condição |
| `cargos_periodos` | código do cargo, nome, inscritos, deferidos |

Cada tipo tem um template XLSX para download no sistema.

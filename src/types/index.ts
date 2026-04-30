export type UserRole = 'admin' | 'logistica' | 'coordenador'

export interface Usuario {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  tenant_id: string
}

export interface AuthState {
  token: string | null
  user: Usuario | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export type CertameStatus =
  | 'rascunho'
  | 'planejamento'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'

export interface Certame {
  id: string
  tenant_id: string
  titulo: string
  numero_edital?: string
  orgao?: string
  tipo?: string
  data_aplicacao?: string
  status: CertameStatus
  observacoes?: string
  criado_em: string
  atualizado_em: string
}
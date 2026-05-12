import api from './api'
import axios from 'axios'

// API pública (sem autenticação)
const publicApi = axios.create({ baseURL: '/api/v1' })

// API do portal do colaborador
const portalApi = axios.create({ baseURL: '/api/v1' })
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('glc_portal_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
portalApi.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('glc_portal_token')
      localStorage.removeItem('glc_portal_id')
      localStorage.removeItem('glc_portal_nome')
      window.location.href = '/portal/colaborador/login'
    }
    return Promise.reject(error)
  }
)

export interface ColaboradorAdmin {
  id: string
  nome: string
  cpf?: string
  celular?: string
  email?: string
  status: 'pendente' | 'ativo' | 'inativo'
  token_convite?: string
  token_expiry?: string
  criado_em: string
  certames: ColaboradorCertame[]
}

export interface ColaboradorCertame {
  id: string
  certame_id: string
  titulo: string
  orgao?: string
  funcao?: string
}

export interface ConviteInfo {
  nome: string
  cpf: string
  status: string
}

export interface CertamePortal {
  id: string
  certame_id: string
  titulo: string
  orgao?: string
  data_aplicacao?: string
  status: string
  funcao?: string
}

export interface MembroEquipe {
  id: string
  certame_id: string
  colaborador_id: string
  funcao?: string | null
  nome: string
  cpf?: string | null
  celular?: string | null
  email?: string | null
  status: 'pendente' | 'ativo' | 'inativo'
}

// ── Admin ────────────────────────────────────────────────────────────────────

export const colaboradoresAdminService = {
  listar: async (): Promise<ColaboradorAdmin[]> => {
    const { data } = await api.get('/colaboradores')
    return data
  },

  preCadastrar: async (payload: { nome: string; cpf: string; celular: string }): Promise<ColaboradorAdmin> => {
    const { data } = await api.post('/colaboradores/pre-cadastro', payload)
    return data
  },

  deletar: async (id: string): Promise<void> => {
    await api.delete(`/colaboradores/${id}`)
  },

  reenviarConvite: async (id: string): Promise<ColaboradorAdmin> => {
    const { data } = await api.post(`/colaboradores/${id}/reenviar-convite`)
    return data
  },

  vincularCertame: async (id: string, certame_id: string, funcao?: string): Promise<ColaboradorCertame> => {
    const { data } = await api.post(`/colaboradores/${id}/vincular-certame`, { certame_id, funcao })
    return data
  },

  desvincularCertame: async (id: string, certame_id: string): Promise<void> => {
    await api.delete(`/colaboradores/${id}/certames/${certame_id}`)
  },
}

// ── Equipe por certame ────────────────────────────────────────────────────────

export const certameEquipeService = {
  listar: async (certameId: string): Promise<MembroEquipe[]> => {
    const { data } = await api.get(`/certames/${certameId}/equipe`)
    return data
  },

  vincular: async (colabId: string, certameId: string, funcao?: string): Promise<ColaboradorCertame> => {
    return colaboradoresAdminService.vincularCertame(colabId, certameId, funcao)
  },

  desvincular: async (vinculoColabId: string, certameId: string): Promise<void> => {
    return colaboradoresAdminService.desvincularCertame(vinculoColabId, certameId)
  },
}

// ── Convite / Portal ──────────────────────────────────────────────────────────

export const conviteService = {
  verificar: async (token: string): Promise<ConviteInfo> => {
    const { data } = await publicApi.get(`/colaboradores/convite/${token}`)
    return data
  },

  completar: async (token: string, payload: object): Promise<ConviteInfo> => {
    const { data } = await publicApi.post(`/colaboradores/completar-cadastro/${token}`, payload)
    return data
  },

  login: async (cpf: string, senha: string): Promise<{ access_token: string; colaborador_id: string; nome: string }> => {
    const { data } = await publicApi.post('/colaboradores/login', { cpf, senha })
    return data
  },
}

export const portalService = {
  perfil: async (): Promise<ConviteInfo & { id: string; celular?: string; email?: string }> => {
    const { data } = await portalApi.get('/colaboradores/portal/perfil')
    return data
  },

  certames: async (): Promise<CertamePortal[]> => {
    const { data } = await portalApi.get('/colaboradores/portal/certames')
    return data
  },
}

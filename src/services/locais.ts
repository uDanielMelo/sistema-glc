import api from './api'

export interface Sala {
  id: string
  local_id: string
  numero: string
  capacidade: number
  bloco?: string
  andar?: string
  acessivel: boolean
  observacoes?: string
}

export interface Local {
  id: string
  certame_id?: string | null
  nome: string
  codigo?: string
  endereco?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  total_salas: number
  capacidade_total: number
  acessivel: boolean
  observacoes?: string
  coordenador_id?: string
  salas: Sala[]
}

export const locaisService = {
  listar: async (params?: { certame_id?: string; standalone?: boolean; search?: string; cidade?: string; uf?: string }): Promise<Local[]> => {
    const { data } = await api.get('/locais', { params })
    return data
  },

  buscar: async (id: string): Promise<Local> => {
    const { data } = await api.get(`/locais/${id}`)
    return data
  },

  criar: async (payload: Omit<Local, 'id' | 'salas' | 'certame_id'> & { certame_id?: string }): Promise<Local> => {
    const { data } = await api.post('/locais', payload)
    return data
  },

  atualizar: async (id: string, payload: Partial<Local>): Promise<Local> => {
    const { data } = await api.put(`/locais/${id}`, payload)
    return data
  },

  deletar: async (id: string): Promise<void> => {
    await api.delete(`/locais/${id}`)
  },

  atualizarCertame: async (id: string, certame_id: string | null): Promise<Local> => {
    const { data } = await api.patch(`/locais/${id}/certame`, { certame_id })
    return data
  },

  criarSala: async (local_id: string, payload: Omit<Sala, 'id' | 'local_id'>): Promise<Sala> => {
    const { data } = await api.post(`/locais/${local_id}/salas`, { ...payload, local_id })
    return data
  },

  criarSalasLote: async (local_id: string, payload: {
    quantidade: number; prefixo?: string; capacidade?: number; bloco?: string; andar?: string
  }): Promise<Sala[]> => {
    const { data } = await api.post(`/locais/${local_id}/salas/bulk`, payload)
    return data
  },

  atualizarSala: async (id: string, payload: Partial<Sala>): Promise<Sala> => {
    const { data } = await api.put(`/salas/${id}`, payload)
    return data
  },

  deletarSala: async (sala_id: string): Promise<void> => {
    await api.delete(`/salas/${sala_id}`)
  },

  importarSalas: async (local_id: string, file: File): Promise<Sala[]> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/locais/${local_id}/salas/importar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  importar: async (file: File, certame_id?: string): Promise<Local[]> => {
    const form = new FormData()
    form.append('file', file)
    const params = certame_id ? `?certame_id=${certame_id}` : ''
    const { data } = await api.post(`/locais/importar${params}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
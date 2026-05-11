import api from './api'

export interface Sala {
  id: string
  local_id: string
  numero: string
  capacidade: number
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
  listar: async (params?: { certame_id?: string; search?: string; cidade?: string; uf?: string }): Promise<Local[]> => {
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

  criarSala: async (local_id: string, payload: Omit<Sala, 'id' | 'local_id'>): Promise<Sala> => {
    const { data } = await api.post(`/locais/${local_id}/salas`, { ...payload, local_id })
    return data
  },

  deletarSala: async (sala_id: string): Promise<void> => {
    await api.delete(`/salas/${sala_id}`)
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
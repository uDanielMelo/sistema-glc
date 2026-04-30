import api from './api'

export interface Periodo {
  id: string
  certame_id: string
  numero: number
  label?: string
  data_hora?: string
  duracao_minutos?: number
}

export interface Cargo {
  id: string
  certame_id: string
  periodo_id?: string | null
  nome: string
  codigo?: string
  total_inscritos: number
  total_deferidos: number
}

export const periodosService = {
  listarPeriodos: async (certame_id: string): Promise<Periodo[]> => {
    const { data } = await api.get('/periodos', { params: { certame_id } })
    return data
  },

  criarPeriodo: async (payload: Omit<Periodo, 'id'>): Promise<Periodo> => {
    const { data } = await api.post('/periodos', payload)
    return data
  },

  atualizarPeriodo: async (id: string, payload: Partial<Periodo>): Promise<Periodo> => {
    const { data } = await api.put(`/periodos/${id}`, payload)
    return data
  },

  deletarPeriodo: async (id: string): Promise<void> => {
    await api.delete(`/periodos/${id}`)
  },

  listarCargos: async (certame_id: string): Promise<Cargo[]> => {
    const { data } = await api.get('/cargos', { params: { certame_id } })
    return data
  },

  atualizarCargo: async (id: string, periodo_id: string | null): Promise<Cargo> => {
    const { data } = await api.put(`/cargos/${id}`, { periodo_id })
    return data
  },

  importarCargos: async (certame_id: string, file: File): Promise<Cargo[]> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post(`/cargos/importar?certame_id=${certame_id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
}
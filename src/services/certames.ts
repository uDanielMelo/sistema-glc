import api from './api'
import type { Certame, CertameStatus } from '../types'

export const certamesService = {
  listar: async (): Promise<Certame[]> => {
    const { data } = await api.get('/certames/')
    return data
  },

  buscar: async (id: string): Promise<Certame> => {
    const { data } = await api.get(`/certames/${id}`)
    return data
  },

  criar: async (payload: {
    titulo: string
    numero_edital?: string
    orgao?: string
    tipo?: string
    data_aplicacao?: string
    observacoes?: string
  }): Promise<Certame> => {
    const { data } = await api.post('/certames/', payload)
    return data
  },

  atualizar: async (id: string, payload: Partial<Certame>): Promise<Certame> => {
    const { data } = await api.put(`/certames/${id}`, payload)
    return data
  },

  deletar: async (id: string): Promise<void> => {
    await api.delete(`/certames/${id}`)
  },

  mudarStatus: async (id: string, status: CertameStatus): Promise<Certame> => {
    const { data } = await api.patch(`/certames/${id}/status?status=${status}`)
    return data
  },
}
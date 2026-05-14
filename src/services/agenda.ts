import api from './api'

export interface AgendaItem {
  id: string
  certame_id: string
  titulo: string
  local: string | null
  data: string | null
  horario: string | null
  observacao: string | null
  criado_em: string
  atualizado_em: string | null
}

export interface AgendaCreate {
  titulo: string
  local?: string
  data?: string
  horario?: string
  observacao?: string
}

export const agendaService = {
  listar: async (certameId: string): Promise<AgendaItem[]> => {
    const { data } = await api.get(`/certames/${certameId}/agenda`)
    return data
  },

  criar: async (certameId: string, payload: AgendaCreate): Promise<AgendaItem> => {
    const { data } = await api.post(`/certames/${certameId}/agenda`, payload)
    return data
  },

  atualizar: async (certameId: string, itemId: string, payload: Partial<AgendaCreate>): Promise<AgendaItem> => {
    const { data } = await api.patch(`/certames/${certameId}/agenda/${itemId}`, payload)
    return data
  },

  deletar: async (certameId: string, itemId: string): Promise<void> => {
    await api.delete(`/certames/${certameId}/agenda/${itemId}`)
  },
}

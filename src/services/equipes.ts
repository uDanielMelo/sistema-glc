import api from './api'

export interface Coordenador {
  id: string
  nome: string
  cpf?: string
  celular?: string
  chave_pix?: string
  tipo_chave_pix?: string
  banco?: string
  agencia?: string
  conta?: string
  observacoes?: string
  criado_em: string
}

export interface Fiscal {
  id: string
  nome: string
  cpf?: string
  telefone?: string
  observacao?: string
  criado_em: string
}

export const equipesService = {
  // Coordenadores
  listarCoordenadores: async (): Promise<Coordenador[]> => {
    const { data } = await api.get('/coordenadores')
    return data
  },

  criarCoordenador: async (payload: Omit<Coordenador, 'id' | 'criado_em'>): Promise<Coordenador> => {
    const { data } = await api.post('/coordenadores', payload)
    return data
  },

  atualizarCoordenador: async (id: string, payload: Partial<Omit<Coordenador, 'id' | 'criado_em'>>): Promise<Coordenador> => {
    const { data } = await api.put(`/coordenadores/${id}`, payload)
    return data
  },

  deletarCoordenador: async (id: string): Promise<void> => {
    await api.delete(`/coordenadores/${id}`)
  },

  // Fiscais
  listarFiscais: async (): Promise<Fiscal[]> => {
    const { data } = await api.get('/fiscais')
    return data
  },

  criarFiscal: async (payload: Omit<Fiscal, 'id' | 'criado_em'>): Promise<Fiscal> => {
    const { data } = await api.post('/fiscais', payload)
    return data
  },

  atualizarFiscal: async (id: string, payload: Partial<Omit<Fiscal, 'id' | 'criado_em'>>): Promise<Fiscal> => {
    const { data } = await api.put(`/fiscais/${id}`, payload)
    return data
  },

  deletarFiscal: async (id: string): Promise<void> => {
    await api.delete(`/fiscais/${id}`)
  },
}

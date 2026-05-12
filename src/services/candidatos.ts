import api from './api'

export interface CandidatoInfo {
  importado: boolean
  total: number
  com_condicao: number
  importado_em?: string | null
}

export interface SalaInfo {
  sala: string
  total: number
  cargos: string[]
  tem_condicao: boolean
}

export interface PeriodoLocal {
  dia_prova: string | null
  horario: string | null
  total: number
  tem_condicao: boolean
  salas: SalaInfo[]
}

export interface LocalAplicacao {
  local_nome: string
  total_salas: number
  total_candidatos: number
  tem_condicao: boolean
  periodos: PeriodoLocal[]
}

export interface PeriodoAplicacao {
  dia_prova: string
  horarios: string[]
  cargos: string[]
  locais: string[]
  total: number
}

export interface Candidato {
  id: string
  numero_inscricao?: string | null
  nome: string
  cpf?: string | null
  vaga?: string | null
  dia_prova?: string | null
  horario?: string | null
  local_nome?: string | null
  sala?: string | null
  condicao_especial?: string | null
}

export interface Responsavel {
  nome: string
  contato: string
  obs?: string
}

export interface LocalInfo {
  local_nome: string
  responsaveis: Responsavel[]
  colaboradores_ids: string[]
}

export const candidatosService = {
  info: async (certameId: string): Promise<CandidatoInfo> => {
    const { data } = await api.get(`/certames/${certameId}/candidatos/info`)
    return data
  },

  importar: async (certameId: string, arquivo: File): Promise<{ total: number }> => {
    const form = new FormData()
    form.append('arquivo', arquivo)
    const { data } = await api.post(`/certames/${certameId}/candidatos/importar`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  listar: async (
    certameId: string,
    params?: { local?: string; sala?: string; dia?: string; busca?: string }
  ): Promise<Candidato[]> => {
    const { data } = await api.get(`/certames/${certameId}/candidatos`, { params })
    return data
  },

  locais: async (certameId: string): Promise<LocalAplicacao[]> => {
    const { data } = await api.get(`/certames/${certameId}/candidatos/locais`)
    return data
  },

  periodos: async (certameId: string): Promise<PeriodoAplicacao[]> => {
    const { data } = await api.get(`/certames/${certameId}/candidatos/periodos-aplicacao`)
    return data
  },

  editarCondicao: async (certameId: string, candidatoId: string, condicao: string | null): Promise<Candidato> => {
    const { data } = await api.patch(`/certames/${certameId}/candidatos/${candidatoId}`, {
      condicao_especial: condicao || null,
    })
    return data
  },

  remover: async (certameId: string): Promise<void> => {
    await api.delete(`/certames/${certameId}/candidatos`)
  },

  locaisInfo: async (certameId: string): Promise<LocalInfo[]> => {
    const { data } = await api.get(`/certames/${certameId}/locais-info`)
    return data
  },

  salvarLocalInfo: async (certameId: string, localNome: string, responsaveis: Responsavel[], colaboradoresIds?: string[]): Promise<LocalInfo> => {
    const { data } = await api.post(`/certames/${certameId}/locais-info`, { local_nome: localNome, responsaveis, colaboradores_ids: colaboradoresIds ?? [] })
    return data
  },
}

import api from './api'

export interface CertameArquivo {
  id: string
  titulo: string
  nome_original: string
  mime_type?: string
  tamanho?: number
  criado_em: string
}

export const arquivosService = {
  listar: async (certameId: string): Promise<CertameArquivo[]> => {
    const { data } = await api.get(`/certames/${certameId}/arquivos`)
    return data
  },

  upload: async (certameId: string, titulo: string, arquivo: File): Promise<CertameArquivo> => {
    const form = new FormData()
    form.append('titulo', titulo)
    form.append('arquivo', arquivo)
    const { data } = await api.post(`/certames/${certameId}/arquivos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deletar: async (certameId: string, arquivoId: string): Promise<void> => {
    await api.delete(`/certames/${certameId}/arquivos/${arquivoId}`)
  },

  abrir: async (certameId: string, arquivoId: string, nomeOriginal: string): Promise<void> => {
    const { data, headers } = await api.get(
      `/certames/${certameId}/arquivos/${arquivoId}/visualizar`,
      { responseType: 'blob' }
    )
    const mime = String(headers['content-type'] || 'application/octet-stream')
    const blob = new Blob([data], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noreferrer'
    if (mime.startsWith('image/') || mime === 'application/pdf') {
      window.open(url, '_blank', 'noreferrer')
    } else {
      a.download = nomeOriginal
      a.click()
    }
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  },
}

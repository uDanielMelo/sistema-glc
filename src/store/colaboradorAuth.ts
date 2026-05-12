import { create } from 'zustand'

interface ColaboradorAuthState {
  token: string | null
  colaboradorId: string | null
  nome: string | null
  setAuth: (token: string, colaboradorId: string, nome: string) => void
  logout: () => void
}

export const useColaboradorAuth = create<ColaboradorAuthState>((set) => ({
  token: localStorage.getItem('glc_portal_token'),
  colaboradorId: localStorage.getItem('glc_portal_id'),
  nome: localStorage.getItem('glc_portal_nome'),

  setAuth: (token, colaboradorId, nome) => {
    localStorage.setItem('glc_portal_token', token)
    localStorage.setItem('glc_portal_id', colaboradorId)
    localStorage.setItem('glc_portal_nome', nome)
    set({ token, colaboradorId, nome })
  },

  logout: () => {
    localStorage.removeItem('glc_portal_token')
    localStorage.removeItem('glc_portal_id')
    localStorage.removeItem('glc_portal_nome')
    set({ token: null, colaboradorId: null, nome: null })
  },
}))

import { create } from 'zustand'
import type { AuthState } from '../types'
import api from '../services/api'

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('glc_token'),
  user: JSON.parse(localStorage.getItem('glc_user') || 'null'),

  login: async (email: string, password: string) => {
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)

    const { data } = await api.post('/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    localStorage.setItem('glc_token', data.access_token)
    localStorage.setItem('glc_user', JSON.stringify(data.user))

    set({ token: data.access_token, user: data.user })
  },

  logout: () => {
    localStorage.removeItem('glc_token')
    localStorage.removeItem('glc_user')
    set({ token: null, user: null })
  },
})) 
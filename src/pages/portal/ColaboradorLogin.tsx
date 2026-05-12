import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { conviteService } from '../../services/colaboradores'
import { useColaboradorAuth } from '../../store/colaboradorAuth'

export default function ColaboradorLogin() {
  const navigate = useNavigate()
  const setAuth = useColaboradorAuth(s => s.setAuth)
  const [form, setForm] = useState({ cpf: '', senha: '' })
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const res = await conviteService.login(form.cpf, form.senha)
      setAuth(res.access_token, res.colaborador_id, res.nome)
      navigate('/portal/colaborador')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErro(msg || 'CPF ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Portal do Colaborador</h1>
          <p className="text-sm text-gray-400 mt-1">Acesse com seu CPF e senha</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">CPF</label>
            <input
              required
              value={form.cpf}
              onChange={e => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
              className={inp}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Senha</label>
            <input
              required
              type="password"
              value={form.senha}
              onChange={e => setForm({ ...form, senha: e.target.value })}
              placeholder="••••••••"
              className={inp}
            />
          </div>

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{erro}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Recebeu um convite?{' '}
          <Link to="/portal/colaborador/completar-cadastro" className="text-indigo-600 hover:underline">
            Crie sua senha aqui
          </Link>
        </p>
      </div>
    </div>
  )
}

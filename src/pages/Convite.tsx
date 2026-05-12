import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { equipesService } from '../services/equipes'
import type { ConviteInfo } from '../services/equipes'

const TIPOS_PIX = [
  { value: 'cpf', label: 'CPF' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

export default function Convite() {
  const { token } = useParams<{ token: string }>()
  const [info, setInfo] = useState<ConviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    cpf: '',
    celular: '',
    chave_pix: '',
    tipo_chave_pix: 'cpf',
    banco: '',
    agencia: '',
    conta: '',
    observacoes: '',
  })

  useEffect(() => {
    if (!token) return
    equipesService.buscarConvite(token)
      .then(setInfo)
      .catch(() => setErro('Link inválido ou expirado.'))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) return
    setEnviando(true)
    try {
      await equipesService.submeterConvite(token, {
        nome: form.nome,
        cpf: form.cpf || undefined,
        celular: form.celular || undefined,
        chave_pix: form.chave_pix || undefined,
        tipo_chave_pix: form.tipo_chave_pix || undefined,
        banco: form.banco || undefined,
        agencia: form.agencia || undefined,
        conta: form.conta || undefined,
        observacoes: form.observacoes || undefined,
      })
      setSucesso(true)
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (erro && !info) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Link inválido</h2>
          <p className="text-sm text-gray-400">{erro}</p>
        </div>
      </div>
    )
  }

  if (info?.ja_cadastrado || sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Cadastro realizado!</h2>
          <p className="text-sm text-gray-400">
            {sucesso
              ? 'Suas informações foram registradas com sucesso.'
              : 'Este convite já foi preenchido anteriormente.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-7">
          <div className="mb-6">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Cadastro de coordenador</p>
            <h1 className="text-xl font-bold text-gray-900">{info?.certame_titulo}</h1>
            {info?.certame_orgao && <p className="text-sm text-gray-400 mt-0.5">{info.certame_orgao}</p>}
            {info?.email && (
              <p className="text-xs text-gray-400 mt-2">Convite enviado para <strong>{info.email}</strong></p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
              <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                placeholder="Seu nome completo" className={inp} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
                <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                <input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })}
                  placeholder="(00) 00000-0000" className={inp} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Dados para pagamento (PIX)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de chave</label>
                  <select value={form.tipo_chave_pix} onChange={e => setForm({ ...form, tipo_chave_pix: e.target.value })}
                    className={inp}>
                    {TIPOS_PIX.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Chave PIX</label>
                  <input value={form.chave_pix} onChange={e => setForm({ ...form, chave_pix: e.target.value })}
                    placeholder="Sua chave PIX" className={inp} />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-700 mb-3">Dados bancários (opcional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}
                    placeholder="Ex: Banco do Brasil" className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Agência</label>
                  <input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })}
                    placeholder="0000" className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Conta</label>
                  <input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })}
                    placeholder="00000-0" className={inp} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                rows={2} placeholder="Alguma informação adicional..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>

            {erro && <p className="text-sm text-red-500">{erro}</p>}

            <button type="submit" disabled={enviando}
              className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 mt-2">
              {enviando ? 'Enviando...' : 'Enviar cadastro'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

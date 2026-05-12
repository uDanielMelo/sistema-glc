import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { conviteService, type ConviteInfo } from '../../services/colaboradores'

const TIPOS_PIX = [
  { value: '', label: 'Selecione...' },
  { value: 'cpf', label: 'CPF' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

const ESTADOS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
]

export default function CompletarCadastro() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [convite, setConvite] = useState<ConviteInfo | null>(null)
  const [loadingConvite, setLoadingConvite] = useState(true)
  const [erroConvite, setErroConvite] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const [form, setForm] = useState({
    senha: '',
    confirmar_senha: '',
    email: '',
    data_nascimento: '',
    rg: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo_chave_pix: '',
    chave_pix: '',
  })

  useEffect(() => {
    if (!token) return
    conviteService.verificar(token)
      .then(setConvite)
      .catch((err) => {
        const msg = err?.response?.data?.detail || 'Convite inválido ou expirado.'
        setErroConvite(msg)
      })
      .finally(() => setLoadingConvite(false))
  }, [token])

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErroForm('')

    if (form.senha.length < 6) {
      setErroForm('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (form.senha !== form.confirmar_senha) {
      setErroForm('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    try {
      const payload = { ...form }
      // Remover campos vazios e confirmar_senha
      const { confirmar_senha: _, ...rest } = payload
      const limpo = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== '')
      )
      await conviteService.completar(token!, limpo)
      setConcluido(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErroForm(msg || 'Erro ao completar o cadastro. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const label = 'block text-xs text-gray-500 mb-1'

  if (loadingConvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Verificando convite...</p>
      </div>
    )
  }

  if (erroConvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white border border-red-200 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Convite inválido</h2>
            <p className="text-sm text-gray-500">{erroConvite}</p>
          </div>
        </div>
      </div>
    )
  }

  if (concluido) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white border border-green-200 rounded-2xl p-8 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Cadastro concluído!</h2>
            <p className="text-sm text-gray-500 mb-6">
              Sua conta foi criada com sucesso. Agora você pode acessar o portal.
            </p>
            <button
              onClick={() => navigate('/portal/colaborador/login')}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Ir para o login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Complete seu cadastro</h1>
          <p className="text-sm text-gray-500 mt-1">Olá, <strong>{convite?.nome}</strong>! Preencha os dados abaixo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Acesso */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Dados de acesso</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Senha *</label>
                <input required type="password" value={form.senha} onChange={set('senha')} placeholder="Mínimo 6 caracteres" className={inp} />
              </div>
              <div>
                <label className={label}>Confirmar senha *</label>
                <input required type="password" value={form.confirmar_senha} onChange={set('confirmar_senha')} placeholder="Repita a senha" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={label}>E-mail</label>
                <input type="email" value={form.email} onChange={set('email')} placeholder="seu@email.com" className={inp} />
              </div>
            </div>
          </div>

          {/* Dados pessoais */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Dados pessoais</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Data de nascimento</label>
                <input type="date" value={form.data_nascimento} onChange={set('data_nascimento')} className={inp} />
              </div>
              <div>
                <label className={label}>RG</label>
                <input value={form.rg} onChange={set('rg')} placeholder="000000000" className={inp} />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Endereço</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>CEP</label>
                <input value={form.cep} onChange={set('cep')} placeholder="00000-000" className={inp} />
              </div>
              <div className="col-span-2">
                <label className={label}>Logradouro</label>
                <input value={form.endereco} onChange={set('endereco')} placeholder="Rua, Av..." className={inp} />
              </div>
              <div>
                <label className={label}>Número</label>
                <input value={form.numero} onChange={set('numero')} className={inp} />
              </div>
              <div>
                <label className={label}>Complemento</label>
                <input value={form.complemento} onChange={set('complemento')} placeholder="Apto, sala..." className={inp} />
              </div>
              <div>
                <label className={label}>Bairro</label>
                <input value={form.bairro} onChange={set('bairro')} className={inp} />
              </div>
              <div>
                <label className={label}>Cidade</label>
                <input value={form.cidade} onChange={set('cidade')} className={inp} />
              </div>
              <div>
                <label className={label}>Estado</label>
                <select value={form.estado} onChange={set('estado')} className={inp}>
                  <option value="">Selecione...</option>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Dados bancários */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Dados bancários</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={label}>Banco</label>
                <input value={form.banco} onChange={set('banco')} placeholder="Nome ou código do banco" className={inp} />
              </div>
              <div>
                <label className={label}>Agência</label>
                <input value={form.agencia} onChange={set('agencia')} className={inp} />
              </div>
              <div>
                <label className={label}>Conta</label>
                <input value={form.conta} onChange={set('conta')} className={inp} />
              </div>
              <div>
                <label className={label}>Tipo de chave PIX</label>
                <select value={form.tipo_chave_pix} onChange={set('tipo_chave_pix')} className={inp}>
                  {TIPOS_PIX.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Chave PIX</label>
                <input value={form.chave_pix} onChange={set('chave_pix')} className={inp} />
              </div>
            </div>
          </div>

          {erroForm && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{erroForm}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Concluir cadastro'}
          </button>
        </form>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import {
  colaboradoresAdminService,
  type ColaboradorAdmin,
} from '../services/colaboradores'
import { certamesService } from '../services/certames'

interface CertameOpcao {
  id: string
  titulo: string
  orgao?: string
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  inativo: 'Inativo',
}

const STATUS_STYLE: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700 border border-amber-200',
  ativo: 'bg-green-50 text-green-700 border border-green-200',
  inativo: 'bg-gray-100 text-gray-500 border border-gray-200',
}

function linkConvite(token: string) {
  return `${window.location.origin}/portal/colaborador/completar-cadastro/${token}`
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<ColaboradorAdmin[]>([])
  const [certamesDisponiveis, setCertamesDisponiveis] = useState<CertameOpcao[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [vinculandoId, setVinculandoId] = useState<string | null>(null)
  const [copiado, setCopiado] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      colaboradoresAdminService.listar(),
      certamesService.listar(),
    ]).then(([colabs, certs]) => {
      setColaboradores(colabs)
      setCertamesDisponiveis(certs)
    }).finally(() => setLoading(false))
  }, [])

  const copiarLink = (token: string) => {
    navigator.clipboard.writeText(linkConvite(token))
    setCopiado(token)
    setTimeout(() => setCopiado(null), 2000)
  }

  const reenviarConvite = async (id: string) => {
    const atualizado = await colaboradoresAdminService.reenviarConvite(id)
    setColaboradores(prev => prev.map(c => c.id === id ? atualizado : c))
  }

  const deletar = async (id: string) => {
    if (!window.confirm('Excluir este colaborador?')) return
    await colaboradoresAdminService.deletar(id)
    setColaboradores(prev => prev.filter(c => c.id !== id))
  }

  const desvincularCertame = async (colabId: string, certameId: string) => {
    await colaboradoresAdminService.desvincularCertame(colabId, certameId)
    setColaboradores(prev => prev.map(c =>
      c.id === colabId
        ? { ...c, certames: c.certames.filter(v => v.certame_id !== certameId) }
        : c
    ))
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Coordenadores
          <span className="text-gray-400 font-normal text-sm ml-2">({colaboradores.length})</span>
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Pré-cadastrar
          </button>
        )}
      </div>

      {showForm && (
        <PreCadastroForm
          onSave={async (dados) => {
            const novo = await colaboradoresAdminService.preCadastrar(dados)
            setColaboradores(prev => [novo, ...prev])
            setShowForm(false)
            setExpandidoId(novo.id)
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {colaboradores.length === 0 && !showForm ? (
        <div className="py-10 text-center border border-dashed border-gray-200 rounded-xl bg-white">
          <p className="text-gray-400 text-sm">Nenhum colaborador cadastrado.</p>
          <p className="text-gray-300 text-xs mt-1">Clique em "Pré-cadastrar" para adicionar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {colaboradores.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Linha principal */}
              <div className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setExpandidoId(expandidoId === c.id ? null : c.id)}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                    title={expandidoId === c.id ? 'Recolher' : 'Expandir'}
                  >
                    <svg className={`w-4 h-4 transition-transform ${expandidoId === c.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 text-sm">{c.nome}</span>
                    <div className="text-xs text-gray-400 flex gap-3 flex-wrap mt-0.5">
                      {c.cpf && <span>CPF {c.cpf}</span>}
                      {c.celular && <span>{c.celular}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[c.status]}`}>
                    {STATUS_LABEL[c.status]}
                  </span>
                  {c.certames.length > 0 && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {c.certames.length} certame{c.certames.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    onClick={() => deletar(c.id)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    Excluir
                  </button>
                </div>
              </div>

              {/* Painel expandido */}
              {expandidoId === c.id && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4 space-y-4">
                  {/* Link de convite */}
                  {c.status === 'pendente' && c.token_convite && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Link de convite</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600 truncate">
                          {linkConvite(c.token_convite)}
                        </code>
                        <button
                          onClick={() => copiarLink(c.token_convite!)}
                          className={`shrink-0 text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                            copiado === c.token_convite
                              ? 'bg-green-50 text-green-600 border-green-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                          }`}
                        >
                          {copiado === c.token_convite ? 'Copiado!' : 'Copiar'}
                        </button>
                        <button
                          onClick={() => reenviarConvite(c.id)}
                          className="shrink-0 text-xs px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 font-medium transition-colors"
                        >
                          Renovar
                        </button>
                      </div>
                      {c.token_expiry && (
                        <p className="text-xs text-gray-400 mt-1">
                          Expira em {new Date(c.token_expiry).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Certames vinculados */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Certames vinculados</p>
                      <button
                        onClick={() => setVinculandoId(vinculandoId === c.id ? null : c.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        + Vincular
                      </button>
                    </div>

                    {vinculandoId === c.id && (
                      <VincularCertameForm
                        certamesDisponiveis={certamesDisponiveis}
                        jaVinculados={c.certames.map(v => v.certame_id)}
                        onVincular={async (certame_id, funcao) => {
                          const vinculo = await colaboradoresAdminService.vincularCertame(c.id, certame_id, funcao)
                          setColaboradores(prev => prev.map(x =>
                            x.id === c.id ? { ...x, certames: [...x.certames, vinculo] } : x
                          ))
                          setVinculandoId(null)
                        }}
                        onCancel={() => setVinculandoId(null)}
                      />
                    )}

                    {c.certames.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum certame vinculado.</p>
                    ) : (
                      <div className="space-y-1">
                        {c.certames.map(v => (
                          <div key={v.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-sm text-gray-800">{v.titulo}</span>
                              {v.orgao && <span className="text-xs text-gray-400 ml-2">{v.orgao}</span>}
                              {v.funcao && <span className="text-xs text-indigo-600 ml-2">· {v.funcao}</span>}
                            </div>
                            <button
                              onClick={() => desvincularCertame(c.id, v.certame_id)}
                              className="text-xs text-gray-300 hover:text-red-400 ml-3 transition-colors"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Pré-cadastro Form ─────────────────────────────────────────────────────────

function PreCadastroForm({
  onSave,
  onCancel,
}: {
  onSave: (d: { nome: string; cpf: string; celular: string }) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({ nome: '', cpf: '', celular: '' })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    try {
      await onSave(form)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErro(msg || 'Erro ao cadastrar colaborador.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-700 mb-4">Novo colaborador — pré-cadastro</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Nome completo *</label>
          <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inp} placeholder="Ex: João da Silva" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">CPF *</label>
          <input required value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Celular *</label>
          <input required value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="(00) 00000-0000" className={inp} />
        </div>
      </div>
      {erro && <p className="text-xs text-red-500 mb-3">{erro}</p>}
      <p className="text-xs text-gray-400 mb-4">
        Um link de convite será gerado para o colaborador finalizar o cadastro com seus dados e criar uma senha.
      </p>
      <div className="flex gap-2">
        <button type="submit" disabled={salvando}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {salvando ? 'Cadastrando...' : 'Pré-cadastrar e gerar link'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
    </form>
  )
}

// ── Vincular Certame Form ─────────────────────────────────────────────────────

function VincularCertameForm({
  certamesDisponiveis,
  jaVinculados,
  onVincular,
  onCancel,
}: {
  certamesDisponiveis: CertameOpcao[]
  jaVinculados: string[]
  onVincular: (certame_id: string, funcao?: string) => Promise<void>
  onCancel: () => void
}) {
  const disponiveis = certamesDisponiveis.filter(c => !jaVinculados.includes(c.id))
  const [certameId, setCertameId] = useState(disponiveis[0]?.id || '')
  const [funcao, setFuncao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const inp = 'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  if (disponiveis.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2">
        <p className="text-xs text-gray-400">Nenhum certame disponível para vincular.</p>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Fechar</button>
      </div>
    )
  }

  const handleVincular = async () => {
    if (!certameId) return
    setSalvando(true)
    try {
      await onVincular(certameId, funcao || undefined)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white border border-indigo-100 rounded-lg px-3 py-3 mb-2 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Certame</label>
          <select value={certameId} onChange={e => setCertameId(e.target.value)} className={inp}>
            {disponiveis.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}{c.orgao ? ` — ${c.orgao}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Função (opcional)</label>
          <input value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Coord. de Local" className={inp} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleVincular} disabled={salvando || !certameId}
          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
          {salvando ? 'Vinculando...' : 'Vincular'}
        </button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
    </div>
  )
}

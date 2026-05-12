import { useEffect, useState } from 'react'
import { equipesService } from '../services/equipes'
import type { Coordenador, Fiscal } from '../services/equipes'

const TIPOS_PIX = [
  { value: '', label: 'Selecione...' },
  { value: 'cpf', label: 'CPF' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'aleatoria', label: 'Chave aleatória' },
]

export default function Colaboradores() {
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([])
  const [fiscais, setFiscais] = useState<Fiscal[]>([])
  const [loading, setLoading] = useState(true)
  const [showFormCoord, setShowFormCoord] = useState(false)
  const [showFormFiscal, setShowFormFiscal] = useState(false)
  const [editandoCoordId, setEditandoCoordId] = useState<string | null>(null)
  const [editandoFiscalId, setEditandoFiscalId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      equipesService.listarCoordenadores(),
      equipesService.listarFiscais(),
    ]).then(([c, f]) => { setCoordenadores(c); setFiscais(f) })
      .finally(() => setLoading(false))
  }, [])

  const deletarCoordenador = async (id: string) => {
    if (!window.confirm('Excluir este coordenador?')) return
    await equipesService.deletarCoordenador(id)
    setCoordenadores(prev => prev.filter(c => c.id !== id))
  }

  const deletarFiscal = async (id: string) => {
    if (!window.confirm('Excluir este fiscal?')) return
    await equipesService.deletarFiscal(id)
    setFiscais(prev => prev.filter(f => f.id !== id))
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Colaboradores</h2>

      {/* ── Coordenadores ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Coordenadores
            <span className="text-gray-400 font-normal text-sm ml-2">({coordenadores.length})</span>
          </h3>
          {!showFormCoord && (
            <button
              onClick={() => setShowFormCoord(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              + Adicionar
            </button>
          )}
        </div>

        {showFormCoord && (
          <CoordenadorForm
            onSave={async (dados) => {
              const novo = await equipesService.criarCoordenador(dados)
              setCoordenadores(prev => [novo, ...prev])
              setShowFormCoord(false)
            }}
            onCancel={() => setShowFormCoord(false)}
          />
        )}

        {coordenadores.length === 0 && !showFormCoord ? (
          <div className="py-6 text-center border border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">Nenhum coordenador cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {coordenadores.map(c => (
              <div key={c.id} className="border border-gray-200 rounded-xl px-4 py-3">
                {editandoCoordId === c.id ? (
                  <CoordenadorForm
                    inicial={c}
                    onSave={async (dados) => {
                      const atualizado = await equipesService.atualizarCoordenador(c.id, dados)
                      setCoordenadores(prev => prev.map(x => x.id === c.id ? atualizado : x))
                      setEditandoCoordId(null)
                    }}
                    onCancel={() => setEditandoCoordId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{c.nome}</span>
                      <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-3">
                        {c.cpf && <span>CPF {c.cpf}</span>}
                        {c.celular && <span>{c.celular}</span>}
                        {c.chave_pix && (
                          <span>
                            PIX {c.tipo_chave_pix ? `(${c.tipo_chave_pix}) ` : ''}{c.chave_pix}
                          </span>
                        )}
                        {c.banco && (
                          <span>
                            {c.banco}{c.agencia ? ` ag. ${c.agencia}` : ''}{c.conta ? ` c/c ${c.conta}` : ''}
                          </span>
                        )}
                        {c.observacoes && <span className="italic">{c.observacoes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => { setEditandoCoordId(c.id); setShowFormCoord(false) }}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deletarCoordenador(c.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Fiscais ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Fiscais
            <span className="text-gray-400 font-normal text-sm ml-2">({fiscais.length})</span>
          </h3>
          {!showFormFiscal && (
            <button
              onClick={() => setShowFormFiscal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              + Adicionar
            </button>
          )}
        </div>

        {showFormFiscal && (
          <FiscalForm
            onSave={async (dados) => {
              const novo = await equipesService.criarFiscal(dados)
              setFiscais(prev => [novo, ...prev])
              setShowFormFiscal(false)
            }}
            onCancel={() => setShowFormFiscal(false)}
          />
        )}

        {fiscais.length === 0 && !showFormFiscal ? (
          <div className="py-6 text-center border border-dashed border-gray-200 rounded-xl">
            <p className="text-gray-400 text-sm">Nenhum fiscal cadastrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {fiscais.map(f => (
              <div key={f.id} className="border border-gray-200 rounded-xl px-4 py-3">
                {editandoFiscalId === f.id ? (
                  <FiscalForm
                    inicial={f}
                    onSave={async (dados) => {
                      const atualizado = await equipesService.atualizarFiscal(f.id, dados)
                      setFiscais(prev => prev.map(x => x.id === f.id ? atualizado : x))
                      setEditandoFiscalId(null)
                    }}
                    onCancel={() => setEditandoFiscalId(null)}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{f.nome}</span>
                      <div className="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-3">
                        {f.cpf && <span>CPF {f.cpf}</span>}
                        {f.telefone && <span>{f.telefone}</span>}
                        {f.observacao && <span className="italic">{f.observacao}</span>}
                      </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => { setEditandoFiscalId(f.id); setShowFormFiscal(false) }}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deletarFiscal(f.id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CoordenadorForm({ inicial, onSave, onCancel }: {
  inicial?: Partial<Coordenador>
  onSave: (d: Omit<Coordenador, 'id' | 'criado_em'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    nome: inicial?.nome || '',
    cpf: inicial?.cpf || '',
    celular: inicial?.celular || '',
    chave_pix: inicial?.chave_pix || '',
    tipo_chave_pix: inicial?.tipo_chave_pix || '',
    banco: inicial?.banco || '',
    agencia: inicial?.agencia || '',
    conta: inicial?.conta || '',
    observacoes: inicial?.observacoes || '',
  })
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await onSave({
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
    } finally {
      setSalvando(false)
    }
  }

  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Nome *</label>
          <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">CPF</label>
          <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Celular</label>
          <input value={form.celular} onChange={e => setForm({ ...form, celular: e.target.value })} placeholder="(00) 00000-0000" className={inp} />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo de chave PIX</label>
          <select value={form.tipo_chave_pix} onChange={e => setForm({ ...form, tipo_chave_pix: e.target.value })} className={inp}>
            {TIPOS_PIX.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Chave PIX</label>
          <input value={form.chave_pix} onChange={e => setForm({ ...form, chave_pix: e.target.value })} className={inp} />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Banco</label>
          <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Agência</label>
          <input value={form.agencia} onChange={e => setForm({ ...form, agencia: e.target.value })} className={inp} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Conta</label>
          <input value={form.conta} onChange={e => setForm({ ...form, conta: e.target.value })} className={inp} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Observações</label>
          <input value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className={inp} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={salvando}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
    </form>
  )
}

function FiscalForm({ inicial, onSave, onCancel }: {
  inicial?: Partial<Fiscal>
  onSave: (d: Omit<Fiscal, 'id' | 'criado_em'>) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    nome: inicial?.nome || '',
    cpf: inicial?.cpf || '',
    telefone: inicial?.telefone || '',
    observacao: inicial?.observacao || '',
  })
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await onSave({
        nome: form.nome,
        cpf: form.cpf || undefined,
        telefone: form.telefone || undefined,
        observacao: form.observacao || undefined,
      })
    } finally {
      setSalvando(false)
    }
  }

  const inp = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full'

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Nome *</label>
          <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">CPF</label>
          <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className={inp} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Telefone</label>
          <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="(00) 00000-0000" className={inp} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Observação</label>
          <input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} className={inp} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={salvando}
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
      </div>
    </form>
  )
}

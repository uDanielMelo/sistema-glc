import { useEffect, useState, useRef } from 'react'
import { locaisService } from '../services/locais'
import type { Local, Sala } from '../services/locais'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

async function buscarCep(cep: string): Promise<Partial<{ endereco: string; bairro: string; cidade: string; uf: string }>> {
  const limpo = cep.replace(/\D/g, '')
  if (limpo.length !== 8) return {}
  try {
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`)
    const d = await res.json()
    if (d.erro) return {}
    return { endereco: d.logradouro || '', bairro: d.bairro || '', cidade: d.localidade || '', uf: d.uf || '' }
  } catch {
    return {}
  }
}

export default function Locais() {
  const [locais, setLocais] = useState<Local[]>([])
  const [localAberto, setLocalAberto] = useState<Local | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('')
  const [filtroUf, setFiltroUf] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (search) params.search = search
    if (filtroCidade) params.cidade = filtroCidade
    if (filtroUf) params.uf = filtroUf
    locaisService.listar(params).then(setLocais).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const importados = await locaisService.importar(file)
      setLocais(prev => [...importados, ...prev])
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const deletar = async (id: string) => {
    if (!window.confirm('Excluir este local? As salas também serão removidas.')) return
    await locaisService.deletar(id)
    setLocais(prev => prev.filter(l => l.id !== id))
    if (localAberto?.id === id) setLocalAberto(null)
  }

  if (localAberto) {
    return (
      <LocalDetalhe
        local={localAberto}
        onVoltar={() => { carregar(); setLocalAberto(null) }}
        onAtualizar={l => setLocalAberto(l)}
        onDeletar={() => { deletar(localAberto.id); setLocalAberto(null) }}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Locais de Prova</h2>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importar} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            Importar planilha
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Novo local
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por nome</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()}
            placeholder="Nome do local..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="min-w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1">Cidade</label>
          <input
            value={filtroCidade}
            onChange={e => setFiltroCidade(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && carregar()}
            placeholder="Cidade..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">UF</label>
          <select
            value={filtroUf}
            onChange={e => setFiltroUf(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas</option>
            {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>
        <button
          onClick={carregar}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Buscar
        </button>
        {(search || filtroCidade || filtroUf) && (
          <button
            onClick={() => { setSearch(''); setFiltroCidade(''); setFiltroUf(''); setTimeout(carregar, 0) }}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loading && <p className="text-gray-400 text-sm">Carregando...</p>}

      {!loading && locais.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum local encontrado.</p>
          <p className="text-gray-300 text-xs mt-1">Importe uma planilha ou adicione manualmente.</p>
        </div>
      )}

      {locais.length > 0 && (
        <div className="space-y-2">
          {locais.map(l => (
            <div
              key={l.id}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer"
              onClick={() => setLocalAberto(l)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{l.nome}</span>
                  {l.codigo && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{l.codigo}</span>}
                  {l.acessivel && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Acessível</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                  {l.endereco && <span>{l.endereco}</span>}
                  {l.cidade && <span>{l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
                  {l.cep && <span>CEP {l.cep}</span>}
                  {l.total_salas > 0 && <span>{l.total_salas} sala{l.total_salas !== 1 ? 's' : ''}</span>}
                  {l.capacidade_total > 0 && <span>{l.capacidade_total.toLocaleString('pt-BR')} vagas</span>}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); deletar(l.id) }}
                className="text-gray-300 hover:text-red-400 text-xs ml-4 transition-colors"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NovoLocalModal
          onClose={() => setShowModal(false)}
          onCreated={l => { setLocais(prev => [l, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

function LocalDetalhe({ local, onVoltar, onAtualizar, onDeletar }: {
  local: Local
  onVoltar: () => void
  onAtualizar: (l: Local) => void
  onDeletar: () => void
}) {
  const [salas, setSalas] = useState<Sala[]>(local.salas || [])
  const [editando, setEditando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [form, setForm] = useState({
    nome: local.nome,
    codigo: local.codigo || '',
    endereco: local.endereco || '',
    bairro: local.bairro || '',
    cidade: local.cidade || '',
    uf: local.uf || '',
    cep: local.cep || '',
    acessivel: local.acessivel,
    observacoes: local.observacoes || '',
  })

  const handleCepChange = async (cep: string) => {
    setForm(f => ({ ...f, cep }))
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      const dados = await buscarCep(limpo)
      setBuscandoCep(false)
      if (Object.keys(dados).length) setForm(f => ({ ...f, ...dados }))
    }
  }

  const salvarEdicao = async () => {
    const atualizado = await locaisService.atualizar(local.id, form)
    onAtualizar(atualizado)
    setEditando(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-xl font-semibold text-gray-900">{local.nome}</h2>
        </div>
        <div className="flex gap-2">
          {!editando && (
            <button onClick={onDeletar} className="border border-red-200 text-red-500 rounded-lg px-4 py-2 text-sm hover:bg-red-50">
              Excluir
            </button>
          )}
          <button
            onClick={() => setEditando(!editando)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            {editando ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        {editando ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Nome *</label>
              <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código</label>
              <input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">CEP {buscandoCep && <span className="text-indigo-400">(buscando...)</span>}</label>
              <input value={form.cep} onChange={e => handleCepChange(e.target.value)} maxLength={9}
                placeholder="00000-000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Endereço</label>
              <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bairro</label>
              <input value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cidade</label>
              <input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">UF</label>
              <select value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-</option>
                {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input type="checkbox" checked={form.acessivel}
                onChange={e => setForm({ ...form, acessivel: e.target.checked })} className="rounded" />
              <label className="text-sm text-gray-700">Acessível para cadeirantes</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <button onClick={salvarEdicao} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Salvar alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            {([
              ['Nome', local.nome],
              ['Código', local.codigo],
              ['CEP', local.cep],
              ['Endereço', local.endereco],
              ['Bairro', local.bairro],
              ['Cidade', local.cidade],
              ['UF', local.uf],
              ['Acessível', local.acessivel ? 'Sim' : 'Não'],
              ['Observações', local.observacoes],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
              <div key={label}>
                <span className="text-gray-400 text-xs">{label}</span>
                <div className="text-gray-900">{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SalasSection localId={local.id} salas={salas} onChange={setSalas} />
    </div>
  )
}

function NovoLocalModal({ onClose, onCreated }: {
  onClose: () => void
  onCreated: (l: Local) => void
}) {
  const [form, setForm] = useState({
    nome: '',
    codigo: '',
    cep: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    acessivel: false,
    observacoes: '',
    total_salas: 0,
    capacidade_total: 0,
  })
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  const handleCepChange = async (cep: string) => {
    setForm(f => ({ ...f, cep }))
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCep(true)
      const dados = await buscarCep(limpo)
      setBuscandoCep(false)
      if (Object.keys(dados).length) setForm(f => ({ ...f, ...dados }))
    }
  }

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      const local = await locaisService.criar(form)
      onCreated(local)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo local</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nome do local *"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
          <input placeholder="Código"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />

          <div>
            <label className="block text-xs text-gray-500 mb-1">CEP {buscandoCep && <span className="text-indigo-400">(buscando...)</span>}</label>
            <input
              placeholder="00000-000" maxLength={9}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.cep} onChange={e => handleCepChange(e.target.value)} />
          </div>

          <input placeholder="Endereço"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Bairro"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
            <input placeholder="Cidade"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} />
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })}>
              <option value="">UF</option>
              {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.acessivel}
              onChange={e => setForm({ ...form, acessivel: e.target.checked })} className="rounded" />
            <label className="text-sm text-gray-700">Acessível para cadeirantes</label>
          </div>
          <textarea placeholder="Observações" rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SalasSection({ localId, salas, onChange }: {
  localId: string
  salas: Sala[]
  onChange: (salas: Sala[]) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [showLote, setShowLote] = useState(false)
  const [showFormato, setShowFormato] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)
  const [lote, setLote] = useState({ quantidade: 1, prefixo: 'Sala', capacidade: 0, bloco: '', andar: '' })

  const criarEmLote = async () => {
    setCriando(true)
    try {
      const novas = await locaisService.criarSalasLote(localId, {
        quantidade: lote.quantidade,
        prefixo: lote.prefixo,
        capacidade: lote.capacidade,
        bloco: lote.bloco || undefined,
        andar: lote.andar || undefined,
      })
      onChange([...salas, ...novas])
      setShowLote(false)
    } finally {
      setCriando(false)
    }
  }

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const importadas = await locaisService.importarSalas(localId, file)
    onChange([...salas, ...importadas])
    e.target.value = ''
  }

  const salvar = async (id: string, dados: Partial<Sala>) => {
    const atualizada = await locaisService.atualizarSala(id, dados)
    onChange(salas.map(s => s.id === id ? atualizada : s))
    setEditandoId(null)
  }

  const deletar = async (id: string) => {
    await locaisService.deletarSala(id)
    onChange(salas.filter(s => s.id !== id))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">
          Salas <span className="text-gray-400 font-normal text-sm">({salas.length})</span>
        </h3>
        <div className="flex gap-2 flex-wrap justify-end">
          <button onClick={() => setShowFormato(!showFormato)}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1">
            ver formato planilha
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importar} className="hidden" />
          <button onClick={() => fileRef.current?.click()}
            className="text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
            Importar planilha
          </button>
          <button onClick={() => setShowLote(!showLote)}
            className="text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50">
            + Criar salas
          </button>
        </div>
      </div>

      {showFormato && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs">
          <p className="font-medium text-gray-700 mb-2">Formato esperado da planilha de salas:</p>
          <div className="overflow-x-auto">
            <table className="border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-600">
                  {['Número *', 'Capacidade', 'Bloco', 'Andar', 'Acessível'].map(h => (
                    <th key={h} className="border border-gray-300 px-3 py-1.5 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-500">
                <tr>
                  {['01', '40', 'A', 'Térreo', 'Não'].map((v, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-1">{v}</td>
                  ))}
                </tr>
                <tr>
                  {['02', '35', 'B', '1º', 'Sim'].map((v, i) => (
                    <td key={i} className="border border-gray-200 px-3 py-1">{v}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-gray-400">* obrigatório · Acessível: Sim/Não ou S/N · Aceita XLSX e CSV · Colunas Bloco, Andar e Acessível são opcionais</p>
        </div>
      )}

      {showLote && (
        <div className="mb-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
          <p className="text-xs font-medium text-indigo-700 mb-3">Criar salas em lote</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quantidade *</label>
              <input type="number" min={1} max={200} value={lote.quantidade}
                onChange={e => setLote({ ...lote, quantidade: Number(e.target.value) })}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Prefixo</label>
              <input value={lote.prefixo} onChange={e => setLote({ ...lote, prefixo: e.target.value })}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Capacidade padrão</label>
              <input type="number" min={0} value={lote.capacidade || ''}
                onChange={e => setLote({ ...lote, capacidade: Number(e.target.value) })}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bloco</label>
              <input value={lote.bloco} placeholder="A, B..." onChange={e => setLote({ ...lote, bloco: e.target.value })}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Andar</label>
              <input value={lote.andar} placeholder="Térreo..." onChange={e => setLote({ ...lote, andar: e.target.value })}
                className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <button onClick={criarEmLote} disabled={criando || !lote.quantidade}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {criando ? 'Criando...' : `Criar ${lote.quantidade} sala${lote.quantidade !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setShowLote(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Serão criadas: {lote.prefixo} 01, {lote.prefixo} 02{lote.quantidade > 2 ? `, ... ${lote.prefixo} ${String(lote.quantidade).padStart(2, '0')}` : ''}
          </p>
        </div>
      )}

      {salas.length === 0 ? (
        <p className="text-gray-400 text-sm">Nenhuma sala cadastrada.</p>
      ) : (
        <div>
          <div className="grid grid-cols-[1fr_80px_60px_90px_70px_90px] gap-2 pb-2 text-xs font-medium text-gray-400 border-b border-gray-100">
            <span>Nome</span><span>Vagas</span><span>Bloco</span><span>Andar</span><span>Acessível</span><span></span>
          </div>
          {salas.map(s => (
            <SalaRow key={s.id} sala={s}
              editando={editandoId === s.id}
              onEdit={() => setEditandoId(s.id)}
              onSave={d => salvar(s.id, d)}
              onCancel={() => setEditandoId(null)}
              onDelete={() => deletar(s.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function SalaRow({ sala, editando, onEdit, onSave, onCancel, onDelete }: {
  sala: Sala
  editando: boolean
  onEdit: () => void
  onSave: (d: Partial<Sala>) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [form, setForm] = useState({
    numero: sala.numero,
    capacidade: sala.capacidade,
    bloco: sala.bloco || '',
    andar: sala.andar || '',
    acessivel: sala.acessivel,
  })

  const inp = 'border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500'

  if (editando) {
    return (
      <div className="grid grid-cols-[1fr_80px_60px_90px_70px_90px] gap-2 py-2 items-center border-b border-gray-50">
        <input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} className={inp} />
        <input type="number" value={form.capacidade || ''} onChange={e => setForm({ ...form, capacidade: Number(e.target.value) })} className={inp} />
        <input value={form.bloco} onChange={e => setForm({ ...form, bloco: e.target.value })} className={inp} />
        <input value={form.andar} onChange={e => setForm({ ...form, andar: e.target.value })} className={inp} />
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.acessivel} onChange={e => setForm({ ...form, acessivel: e.target.checked })} />
          Sim
        </label>
        <div className="flex gap-2">
          <button onClick={() => onSave(form)} className="text-xs text-indigo-600 hover:underline">Salvar</button>
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[1fr_80px_60px_90px_70px_90px] gap-2 py-2 items-center border-b border-gray-50 last:border-0">
      <span className="text-sm font-medium text-gray-900">{sala.numero}</span>
      <span className="text-sm text-gray-500">{sala.capacidade > 0 ? sala.capacidade : '—'}</span>
      <span className="text-sm text-gray-500">{sala.bloco || '—'}</span>
      <span className="text-sm text-gray-500">{sala.andar || '—'}</span>
      <span>
        {sala.acessivel
          ? <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Sim</span>
          : <span className="text-xs text-gray-300">Não</span>}
      </span>
      <div className="flex gap-2">
        <button onClick={onEdit} className="text-xs text-gray-400 hover:text-indigo-600">Editar</button>
        <button onClick={onDelete} className="text-xs text-gray-300 hover:text-red-400">Excluir</button>
      </div>
    </div>
  )
}

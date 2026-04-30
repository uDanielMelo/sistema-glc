import { useEffect, useState, useRef } from 'react'
import { certamesService } from '../services/certames'
import { locaisService } from '../services/locais'
import type { Local, Sala } from '../services/locais'
import type { Certame } from '../types/index'

export default function Locais() {
  const [certames, setCertames] = useState<Certame[]>([])
  const [certameSelecionado, setCertameSelecionado] = useState('')
  const [locais, setLocais] = useState<Local[]>([])
  const [localAberto, setLocalAberto] = useState<Local | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    certamesService.listar().then(setCertames)
  }, [])

  useEffect(() => {
    if (!certameSelecionado) return
    setLoading(true)
    locaisService.listar(certameSelecionado).then(setLocais).finally(() => setLoading(false))
  }, [certameSelecionado])

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !certameSelecionado) return
    setLoading(true)
    try {
      const importados = await locaisService.importar(certameSelecionado, file)
      setLocais(prev => [...prev, ...importados])
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const deletar = async (id: string) => {
    await locaisService.deletar(id)
    setLocais(prev => prev.filter(l => l.id !== id))
    if (localAberto?.id === id) setLocalAberto(null)
  }

  if (localAberto) {
    return (
      <LocalDetalhe
        local={localAberto}
        onVoltar={() => {
          locaisService.listar(certameSelecionado).then(setLocais)
          setLocalAberto(null)
        }}
        onAtualizar={(l) => setLocalAberto(l)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Locais de Prova</h2>
        <div className="flex gap-2">
          {certameSelecionado && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importar} className="hidden" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Importar XLSX
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                + Novo local
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <label className="block text-xs font-medium text-gray-500 mb-1">Certame</label>
        <select
          value={certameSelecionado}
          onChange={e => { setCertameSelecionado(e.target.value); setLocais([]) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-64"
        >
          <option value="">Selecione um certame</option>
          {certames.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
      </div>

      {loading && <p className="text-gray-400 text-sm">Carregando...</p>}

      {!loading && certameSelecionado && locais.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum local cadastrado ainda.</p>
          <p className="text-gray-300 text-xs mt-1">Importe uma planilha ou adicione manualmente.</p>
        </div>
      )}

      {locais.length > 0 && (
        <div className="space-y-2">
          {locais.map(l => (
            <div key={l.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-indigo-300 transition-colors">
              <div className="cursor-pointer flex-1" onClick={() => setLocalAberto(l)}>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{l.nome}</span>
                  {l.acessivel && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Acessível</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5 flex gap-3">
                  {l.endereco && <span>{l.endereco}</span>}
                  {l.cidade && <span>{l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
                  {l.total_salas > 0 && <span>{l.total_salas} sala{l.total_salas !== 1 ? 's' : ''}</span>}
                  {l.capacidade_total > 0 && <span>{l.capacidade_total.toLocaleString('pt-BR')} vagas</span>}
                </div>
              </div>
              <button
                onClick={() => deletar(l.id)}
                className="text-gray-300 hover:text-red-400 text-xs ml-4 transition-colors"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && certameSelecionado && (
        <NovoLocalModal
          certame_id={certameSelecionado}
          onClose={() => setShowModal(false)}
          onCreated={l => { setLocais(prev => [l, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

function LocalDetalhe({ local, onVoltar, onAtualizar }: {
  local: Local
  onVoltar: () => void
  onAtualizar: (l: Local) => void
}) {
  const [salas, setSalas] = useState<Sala[]>(local.salas || [])
  const [showSala, setShowSala] = useState(false)
  const [editando, setEditando] = useState(false)
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

  const salvarEdicao = async () => {
    const atualizado = await locaisService.atualizar(local.id, form)
    onAtualizar(atualizado)
    setEditando(false)
  }

  const deletarSala = async (sala_id: string) => {
    await locaisService.deletarSala(sala_id)
    setSalas(prev => prev.filter(s => s.id !== sala_id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onVoltar} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
          <h2 className="text-xl font-semibold text-gray-900">{local.nome}</h2>
        </div>
        <button
          onClick={() => setEditando(!editando)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          {editando ? 'Cancelar' : 'Editar'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        {editando ? (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nome', key: 'nome' },
              { label: 'Código', key: 'codigo' },
              { label: 'Endereço', key: 'endereco' },
              { label: 'Bairro', key: 'bairro' },
              { label: 'Cidade', key: 'cidade' },
              { label: 'UF', key: 'uf' },
              { label: 'CEP', key: 'cep' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={form.acessivel}
                onChange={e => setForm({ ...form, acessivel: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm text-gray-700">Acessível para cadeirantes</label>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Observações</label>
              <textarea
                value={form.observacoes}
                onChange={e => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <button onClick={salvarEdicao} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Salvar alterações
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-y-3 text-sm">
            {[
              ['Nome', local.nome],
              ['Código', local.codigo],
              ['Endereço', local.endereco],
              ['Bairro', local.bairro],
              ['Cidade', local.cidade],
              ['UF', local.uf],
              ['CEP', local.cep],
              ['Acessível', local.acessivel ? 'Sim' : 'Não'],
              ['Observações', local.observacoes],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string}>
                <span className="text-gray-400 text-xs">{label}</span>
                <div className="text-gray-900">{value as string}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Salas</h3>
          <button
            onClick={() => setShowSala(true)}
            className="text-sm text-indigo-600 hover:underline"
          >
            + Adicionar sala
          </button>
        </div>

        {salas.length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhuma sala cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {salas.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">Sala {s.numero}</span>
                  {s.capacidade > 0 && <span className="text-gray-400 ml-2">{s.capacidade} vagas</span>}
                  {s.acessivel && <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Acessível</span>}
                </div>
                <button onClick={() => deletarSala(s.id)} className="text-gray-300 hover:text-red-400 text-xs">Excluir</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSala && (
        <NovaSalaModal
          local_id={local.id}
          onClose={() => setShowSala(false)}
          onCreated={s => { setSalas(prev => [...prev, s]); setShowSala(false) }}
        />
      )}
    </div>
  )
}

function NovoLocalModal({ certame_id, onClose, onCreated }: {
  certame_id: string
  onClose: () => void
  onCreated: (l: Local) => void
}) {
  const [form, setForm] = useState({
    certame_id,
    nome: '',
    codigo: '',
    endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    acessivel: false,
    observacoes: '',
    total_salas: 0,
    capacidade_total: 0,
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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
            <input placeholder="UF" maxLength={2}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} />
            <input placeholder="CEP"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} />
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

function NovaSalaModal({ local_id, onClose, onCreated }: {
  local_id: string
  onClose: () => void
  onCreated: (s: Sala) => void
}) {
  const [form, setForm] = useState({ numero: '', capacidade: 0, acessivel: false, observacoes: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const sala = await locaisService.criarSala(local_id, form)
      onCreated(sala)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Nova sala</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Número da sala *"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
          <input type="number" placeholder="Capacidade"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.capacidade} onChange={e => setForm({ ...form, capacidade: Number(e.target.value) })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.acessivel}
              onChange={e => setForm({ ...form, acessivel: e.target.checked })} className="rounded" />
            <label className="text-sm text-gray-700">Acessível</label>
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
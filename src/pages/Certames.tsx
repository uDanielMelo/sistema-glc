import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { certamesService } from '../services/certames'
import type { Certame, CertameStatus } from '../types/index'

const statusLabel: Record<CertameStatus, string> = {
  rascunho: 'Rascunho',
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const statusColor: Record<CertameStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  planejamento: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  finalizado: 'bg-green-100 text-green-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
}

export default function Certames() {
  const [certames, setCertames] = useState<Certame[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    certamesService.listar().then(setCertames).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Certames</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + Novo certame
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Carregando...</p>
      ) : certames.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhum certame cadastrado ainda.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-indigo-600 text-sm hover:underline"
          >
            Criar o primeiro certame
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certames.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/certames/${c.id}`)}
              className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">{c.titulo}</div>
                <div className="text-sm text-gray-400 mt-0.5">
                  {c.orgao && <span>{c.orgao}</span>}
                  {c.numero_edital && <span className="ml-2">· {c.numero_edital}</span>}
                  {c.data_aplicacao && (
                    <span className="ml-2">
                      · {new Date(c.data_aplicacao).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[c.status]}`}>
                {statusLabel[c.status]}
              </span>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NovoCertameModal
          onClose={() => setShowModal(false)}
          onCreated={(c) => {
            setCertames((prev) => [c, ...prev])
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

function NovoCertameModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (c: Certame) => void
}) {
  const [form, setForm] = useState({
    titulo: '',
    numero_edital: '',
    orgao: '',
    tipo: '',
    tipo_prova: '',
    data_aplicacao: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = {
        ...form,
        tipo_prova: form.tipo_prova || undefined,
        data_aplicacao: form.data_aplicacao || undefined,
      }
      const certame = await certamesService.criar(payload)
      onCreated(certame)
    } catch {
      setError('Erro ao criar certame')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo certame</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Título *"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            required
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Órgão"
            value={form.orgao}
            onChange={(e) => setForm({ ...form, orgao: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Número do edital"
            value={form.numero_edital}
            onChange={(e) => setForm({ ...form, numero_edital: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Tipo (ex: concurso público)"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          />
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-700"
            value={form.tipo_prova}
            onChange={(e) => setForm({ ...form, tipo_prova: e.target.value })}
          >
            <option value="">Tipo de prova (opcional)</option>
            <option value="objetiva">Objetiva</option>
            <option value="discursiva">Discursiva</option>
            <option value="pratica">Prática</option>
            <option value="taf">TAF</option>
            <option value="redacao">Redação</option>
            <option value="outro">Outro</option>
          </select>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.data_aplicacao}
            onChange={(e) => setForm({ ...form, data_aplicacao: e.target.value })}
          />
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Observações"
            rows={3}
            value={form.observacoes}
            onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
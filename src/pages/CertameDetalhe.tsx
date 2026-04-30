import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { certamesService } from '../services/certames'
import type { Certame, CertameStatus } from '../types/index'

const statusLabel: Record<CertameStatus, string> = {
  rascunho: 'Rascunho',
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const statusColor: Record<CertameStatus, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  planejamento: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-amber-100 text-amber-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
}

const tabs = ['Visão geral', 'Períodos', 'Locais', 'Equipes', 'Candidatos', 'Ocorrências']

export default function CertameDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [certame, setCertame] = useState<Certame | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Visão geral')

  useEffect(() => {
    if (!id) return
    certamesService.buscar(id).then(setCertame).finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>
  if (!certame) return <p className="text-gray-400 text-sm">Certame não encontrado.</p>

  return (
    <div>
      <button
        onClick={() => navigate('/certames')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{certame.titulo}</h2>
            <div className="flex gap-4 mt-1 text-sm text-gray-400">
              {certame.orgao && <span>{certame.orgao}</span>}
              {certame.numero_edital && <span>· {certame.numero_edital}</span>}
              {certame.data_aplicacao && (
                <span>· {new Date(certame.data_aplicacao).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[certame.status]}`}>
            {statusLabel[certame.status]}
          </span>
        </div>

        {certame.observacoes && (
          <p className="text-sm text-gray-500 mt-3">{certame.observacoes}</p>
        )}
      </div>

      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {activeTab === 'Visão geral' && (
          <div className="space-y-3">
            <Row label="Título" value={certame.titulo} />
            <Row label="Órgão" value={certame.orgao} />
            <Row label="Número do edital" value={certame.numero_edital} />
            <Row label="Tipo" value={certame.tipo} />
            <Row
              label="Data de aplicação"
              value={
                certame.data_aplicacao
                  ? new Date(certame.data_aplicacao).toLocaleDateString('pt-BR')
                  : undefined
              }
            />
            <Row label="Status" value={statusLabel[certame.status]} />
            <Row label="Observações" value={certame.observacoes} />
          </div>
        )}
        {activeTab !== 'Visão geral' && (
          <p className="text-gray-400 text-sm">
            Módulo <strong>{activeTab}</strong> em desenvolvimento.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-4 text-sm">
      <span className="w-40 text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { portalService, type CertamePortal } from '../../services/colaboradores'
import { useColaboradorAuth } from '../../store/colaboradorAuth'

const STATUS_CERTAME: Record<string, { label: string; style: string }> = {
  rascunho: { label: 'Rascunho', style: 'bg-gray-100 text-gray-500' },
  planejamento: { label: 'Planejamento', style: 'bg-blue-50 text-blue-600' },
  em_andamento: { label: 'Em andamento', style: 'bg-green-50 text-green-600' },
  concluido: { label: 'Concluído', style: 'bg-gray-100 text-gray-400' },
  cancelado: { label: 'Cancelado', style: 'bg-red-50 text-red-400' },
}

export default function ColaboradorPortal() {
  const navigate = useNavigate()
  const { nome, logout } = useColaboradorAuth()
  const [certames, setCertames] = useState<CertamePortal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalService.certames()
      .then(setCertames)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/portal/colaborador/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Portal do Colaborador</h1>
            <p className="text-xs text-gray-400 mt-0.5">Olá, {nome}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
          Meus certames
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : certames.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-gray-400 text-sm">Você ainda não foi vinculado a nenhum certame.</p>
            <p className="text-gray-300 text-xs mt-1">Entre em contato com o administrador.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {certames.map(c => {
              const statusInfo = STATUS_CERTAME[c.status] || { label: c.status, style: 'bg-gray-100 text-gray-500' }
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm leading-snug">{c.titulo}</p>
                      {c.orgao && <p className="text-xs text-gray-400 mt-0.5">{c.orgao}</p>}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {c.funcao && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                            {c.funcao}
                          </span>
                        )}
                        {c.data_aplicacao && (
                          <span className="text-xs text-gray-400">
                            {new Date(c.data_aplicacao).toLocaleDateString('pt-BR', {
                              day: '2-digit', month: 'long', year: 'numeric'
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.style}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { certamesService } from '../services/certames'
import { periodosService } from '../services/periodos'
import { locaisService } from '../services/locais'
import { arquivosService, type CertameArquivo } from '../services/arquivos'
import { candidatosService, type CandidatoInfo, type LocalAplicacao, type PeriodoLocal, type Candidato, type PeriodoAplicacao, type LocalInfo, type Responsavel } from '../services/candidatos'
import { colaboradoresAdminService, certameEquipeService, type ColaboradorAdmin, type MembroEquipe } from '../services/colaboradores'
import { gruposFiscaisService, type GrupoFiscais, type FiscalGrupo, type FiscalGrupoPayload } from '../services/gruposFiscais'
import { ocorrenciasService, type Ocorrencia, type OcorrenciaTipo, type OcorrenciaAnexo } from '../services/ocorrencias'
import { agendaService, type AgendaItem } from '../services/agenda'
import type { Periodo, Cargo } from '../services/periodos'
import type { Local } from '../services/locais'
import type { Certame, CertameStatus, TipoProva } from '../types/index'

const statusLabel: Record<CertameStatus, string> = {
  rascunho: 'Rascunho',
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}


const tipoProvaLabel: Record<TipoProva, string> = {
  objetiva: 'Objetiva',
  discursiva: 'Discursiva',
  pratica: 'Prática',
  taf: 'TAF',
  redacao: 'Redação',
  outro: 'Outro',
}

const tabs = ['Visão geral', 'Períodos', 'Locais', 'Equipes', 'Candidatos', 'Ocorrências']

export default function CertameDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [certame, setCertame] = useState<Certame | null>(null)
  const [loading, setLoading] = useState(true)
  const [mudandoStatus, setMudandoStatus] = useState(false)
  const [activeTab, setActiveTab] = useState('Visão geral')
  const [editando, setEditando] = useState(false)
  const [formEdit, setFormEdit] = useState({
    titulo: '',
    orgao: '',
    numero_edital: '',
    tipo: '',
    tipo_prova: '',
    data_aplicacao: '',
    observacoes: '',
  })
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [arquivos, setArquivos] = useState<CertameArquivo[]>([])
  const [loadingArquivos, setLoadingArquivos] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTitulo, setUploadTitulo] = useState('')
  const [uploadArquivo, setUploadArquivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resumo, setResumo] = useState<{
    candidatos: { total: number; com_condicao: number; importado: boolean } | null
    locais: { count: number; total_salas: number } | null
    periodos: { count: number; cargos: number } | null
    equipe: { membros: number; fiscais: number; grupos: number } | null
    ocorrencias: { total: number } | null
  }>({ candidatos: null, locais: null, periodos: null, equipe: null, ocorrencias: null })

  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [loadingAgenda, setLoadingAgenda] = useState(false)
  const [showFormAgenda, setShowFormAgenda] = useState(false)
  const [editandoAgenda, setEditandoAgenda] = useState<AgendaItem | null>(null)
  const [formAgenda, setFormAgenda] = useState({ titulo: '', local: '', data: '', horario: '', observacao: '' })
  const [salvandoAgenda, setSalvandoAgenda] = useState(false)

  useEffect(() => {
    if (!id) return
    certamesService.buscar(id).then(setCertame).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || activeTab !== 'Visão geral') return
    setLoadingArquivos(true)
    arquivosService.listar(id).then(setArquivos).finally(() => setLoadingArquivos(false))
    setLoadingAgenda(true)
    agendaService.listar(id).then(setAgenda).finally(() => setLoadingAgenda(false))
  }, [id, activeTab])

  useEffect(() => {
    if (!id || activeTab !== 'Visão geral') return
    Promise.all([
      candidatosService.info(id),
      candidatosService.locais(id),
      periodosService.listarPeriodos(id),
      periodosService.listarCargos(id),
      certameEquipeService.listar(id),
      gruposFiscaisService.listar(id),
      ocorrenciasService.listar(id),
    ]).then(([info, locaisApl, periodos, cargos, equipe, grupos, ocorrencias]) => {
      setResumo({
        candidatos: { total: info.total, com_condicao: info.com_condicao, importado: info.importado },
        locais: { count: locaisApl.length, total_salas: locaisApl.reduce((s, l) => s + l.total_salas, 0) },
        periodos: { count: periodos.length, cargos: cargos.length },
        equipe: { membros: equipe.length, grupos: grupos.length, fiscais: grupos.reduce((s, g) => s + g.fiscais.length, 0) },
        ocorrencias: { total: ocorrencias.length },
      })
    }).catch(() => {})
  }, [id, activeTab])

  const abrirEdicao = () => {
    if (!certame) return
    setFormEdit({
      titulo: certame.titulo,
      orgao: certame.orgao ?? '',
      numero_edital: certame.numero_edital ?? '',
      tipo: certame.tipo ?? '',
      tipo_prova: certame.tipo_prova ?? '',
      data_aplicacao: certame.data_aplicacao ? certame.data_aplicacao.slice(0, 10) : '',
      observacoes: certame.observacoes ?? '',
    })
    setEditando(true)
  }

  const salvarEdicao = async () => {
    if (!certame) return
    setSalvandoEdit(true)
    try {
      const payload = {
        ...formEdit,
        tipo_prova: (formEdit.tipo_prova as TipoProva) || undefined,
        data_aplicacao: formEdit.data_aplicacao || undefined,
        orgao: formEdit.orgao || undefined,
        numero_edital: formEdit.numero_edital || undefined,
        tipo: formEdit.tipo || undefined,
        observacoes: formEdit.observacoes || undefined,
      }
      const atualizado = await certamesService.atualizar(certame.id, payload)
      setCertame(atualizado)
      setEditando(false)
    } finally {
      setSalvandoEdit(false)
    }
  }

  const enviarArquivo = async () => {
    if (!certame || !uploadArquivo || !uploadTitulo.trim()) return
    setEnviando(true)
    try {
      const novo = await arquivosService.upload(certame.id, uploadTitulo.trim(), uploadArquivo)
      setArquivos(prev => [novo, ...prev])
      setUploadTitulo('')
      setUploadArquivo(null)
      setShowUpload(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setEnviando(false)
    }
  }

  const removerArquivo = async (arquivoId: string) => {
    if (!certame || !window.confirm('Remover este arquivo?')) return
    await arquivosService.deletar(certame.id, arquivoId)
    setArquivos(prev => prev.filter(a => a.id !== arquivoId))
  }

  const selecionarStatus = async (novoStatus: CertameStatus) => {
    if (!certame || certame.status === novoStatus) return
    setMudandoStatus(true)
    try {
      const atualizado = await certamesService.mudarStatus(certame.id, novoStatus)
      setCertame(atualizado)
    } finally {
      setMudandoStatus(false)
    }
  }

  const abrirFormAgenda = (item?: AgendaItem) => {
    if (item) {
      setEditandoAgenda(item)
      setFormAgenda({
        titulo: item.titulo,
        local: item.local ?? '',
        data: item.data ?? '',
        horario: item.horario ?? '',
        observacao: item.observacao ?? '',
      })
    } else {
      setEditandoAgenda(null)
      setFormAgenda({ titulo: '', local: '', data: '', horario: '', observacao: '' })
    }
    setShowFormAgenda(true)
  }

  const fecharFormAgenda = () => {
    setShowFormAgenda(false)
    setEditandoAgenda(null)
    setFormAgenda({ titulo: '', local: '', data: '', horario: '', observacao: '' })
  }

  const salvarAgenda = async () => {
    if (!certame || !formAgenda.titulo.trim()) return
    setSalvandoAgenda(true)
    try {
      const payload = {
        titulo: formAgenda.titulo.trim(),
        local: formAgenda.local.trim() || undefined,
        data: formAgenda.data || undefined,
        horario: formAgenda.horario.trim() || undefined,
        observacao: formAgenda.observacao.trim() || undefined,
      }
      if (editandoAgenda) {
        const atualizado = await agendaService.atualizar(certame.id, editandoAgenda.id, payload)
        setAgenda(prev => prev.map(i => i.id === atualizado.id ? atualizado : i).sort((a, b) => {
          const da = (a.data ?? '') + (a.horario ?? '')
          const db = (b.data ?? '') + (b.horario ?? '')
          if (da && db) return da.localeCompare(db)
          if (da) return -1
          if (db) return 1
          return 0
        }))
      } else {
        const novo = await agendaService.criar(certame.id, payload)
        setAgenda(prev => [...prev, novo].sort((a, b) => {
          const da = (a.data ?? '') + (a.horario ?? '')
          const db = (b.data ?? '') + (b.horario ?? '')
          if (da && db) return da.localeCompare(db)
          if (da) return -1
          if (db) return 1
          return 0
        }))
      }
      fecharFormAgenda()
    } finally {
      setSalvandoAgenda(false)
    }
  }

  const removerAgenda = async (itemId: string) => {
    if (!certame || !window.confirm('Remover este item do cronograma?')) return
    await agendaService.deletar(certame.id, itemId)
    setAgenda(prev => prev.filter(i => i.id !== itemId))
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>
  if (!certame) return <p className="text-gray-400 text-sm">Certame não encontrado.</p>

  const STATUS_OPCOES: { value: CertameStatus; label: string }[] = [
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'em_andamento', label: 'Em andamento' },
    { value: 'finalizado', label: 'Finalizado' },
  ]

  return (
    <div>
      <button
        onClick={() => navigate('/certames')}
        className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
      >
        ← Voltar
      </button>

      <div className="bg-white border border-gray-200 rounded-xl px-6 py-5 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
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
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden shrink-0">
            {STATUS_OPCOES.map((op) => {
              const ativo = certame.status === op.value
              return (
                <button
                  key={op.value}
                  onClick={() => selecionarStatus(op.value)}
                  disabled={mudandoStatus}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 disabled:opacity-50 ${
                    ativo
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {op.label}
                </button>
              )
            })}
          </div>
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
          editando ? (
            <div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Título *</label>
                  <input
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formEdit.titulo}
                    onChange={e => setFormEdit(p => ({ ...p, titulo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Órgão</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formEdit.orgao}
                    onChange={e => setFormEdit(p => ({ ...p, orgao: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Número do edital</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formEdit.numero_edital}
                    onChange={e => setFormEdit(p => ({ ...p, numero_edital: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ex: concurso público"
                    value={formEdit.tipo}
                    onChange={e => setFormEdit(p => ({ ...p, tipo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo de prova</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formEdit.tipo_prova}
                    onChange={e => setFormEdit(p => ({ ...p, tipo_prova: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    <option value="objetiva">Objetiva</option>
                    <option value="discursiva">Discursiva</option>
                    <option value="pratica">Prática</option>
                    <option value="taf">TAF</option>
                    <option value="redacao">Redação</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Data de aplicação</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formEdit.data_aplicacao}
                    onChange={e => setFormEdit(p => ({ ...p, data_aplicacao: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    value={formEdit.observacoes}
                    onChange={e => setFormEdit(p => ({ ...p, observacoes: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditando(false)}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarEdicao}
                  disabled={salvandoEdit || !formEdit.titulo.trim()}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {salvandoEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={abrirEdicao}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                  </svg>
                  Editar
                </button>
              </div>
              <div className="space-y-3">
                <Row label="Título" value={certame.titulo} />
                <Row label="Órgão" value={certame.orgao} />
                <Row label="Número do edital" value={certame.numero_edital} />
                <Row label="Tipo" value={certame.tipo} />
                <Row label="Tipo de prova" value={certame.tipo_prova ? tipoProvaLabel[certame.tipo_prova] : undefined} />
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

              {/* Arquivos */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Arquivos</h4>
                  <button
                    onClick={() => setShowUpload(v => !v)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>

                {showUpload && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 space-y-2">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Título do arquivo (ex: Edital)"
                      value={uploadTitulo}
                      onChange={e => setUploadTitulo(e.target.value)}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      onChange={e => setUploadArquivo(e.target.files?.[0] ?? null)}
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { setShowUpload(false); setUploadTitulo(''); setUploadArquivo(null) }}
                        className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={enviarArquivo}
                        disabled={enviando || !uploadTitulo.trim() || !uploadArquivo}
                        className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {enviando ? 'Enviando...' : 'Enviar'}
                      </button>
                    </div>
                  </div>
                )}

                {loadingArquivos ? (
                  <p className="text-xs text-gray-400">Carregando...</p>
                ) : arquivos.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum arquivo adicionado.</p>
                ) : (
                  <div className="space-y-2">
                    {arquivos.map(arq => (
                      <div key={arq.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <svg className="w-8 h-8 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{arq.titulo}</p>
                          <p className="text-xs text-gray-400 truncate">{arq.nome_original}{arq.tamanho ? ` · ${(arq.tamanho / 1024).toFixed(0)} KB` : ''}</p>
                        </div>
                        <button
                          onClick={() => arquivosService.abrir(certame.id, arq.id, arq.nome_original)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
                        >
                          Abrir
                        </button>
                        <button
                          onClick={() => removerArquivo(arq.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumo */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Resumo</h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                  <button onClick={() => setActiveTab('Candidatos')} className="text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-3 transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Candidatos</p>
                    {resumo.candidatos === null ? (
                      <p className="text-xl font-semibold text-gray-200">—</p>
                    ) : resumo.candidatos.importado ? (
                      <>
                        <p className="text-xl font-semibold text-gray-800">{resumo.candidatos.total.toLocaleString('pt-BR')}</p>
                        {resumo.candidatos.com_condicao > 0 && (
                          <p className="text-xs text-amber-600 mt-0.5">{resumo.candidatos.com_condicao} com condição especial</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">Não importados</p>
                    )}
                  </button>

                  <button onClick={() => setActiveTab('Locais')} className="text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-3 transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Locais</p>
                    {resumo.locais === null ? (
                      <p className="text-xl font-semibold text-gray-200">—</p>
                    ) : resumo.locais.count === 0 ? (
                      <p className="text-xs text-gray-400 mt-1">Nenhum local</p>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-gray-800">{resumo.locais.count}</p>
                        {resumo.locais.total_salas > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{resumo.locais.total_salas} sala{resumo.locais.total_salas !== 1 ? 's' : ''}</p>
                        )}
                      </>
                    )}
                  </button>

                  <button onClick={() => setActiveTab('Períodos')} className="text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-3 transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Períodos</p>
                    {resumo.periodos === null ? (
                      <p className="text-xl font-semibold text-gray-200">—</p>
                    ) : resumo.periodos.count === 0 ? (
                      <p className="text-xs text-gray-400 mt-1">Nenhum período</p>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-gray-800">{resumo.periodos.count}</p>
                        {resumo.periodos.cargos > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{resumo.periodos.cargos} cargo{resumo.periodos.cargos !== 1 ? 's' : ''}</p>
                        )}
                      </>
                    )}
                  </button>

                  <button onClick={() => setActiveTab('Equipes')} className="text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-3 transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Equipes</p>
                    {resumo.equipe === null ? (
                      <p className="text-xl font-semibold text-gray-200">—</p>
                    ) : resumo.equipe.membros + resumo.equipe.fiscais === 0 ? (
                      <p className="text-xs text-gray-400 mt-1">Nenhum membro</p>
                    ) : (
                      <>
                        {resumo.equipe.membros > 0 && (
                          <p className="text-xl font-semibold text-gray-800">{resumo.equipe.membros} membro{resumo.equipe.membros !== 1 ? 's' : ''}</p>
                        )}
                        {resumo.equipe.fiscais > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">{resumo.equipe.fiscais} {resumo.equipe.fiscais !== 1 ? 'fiscais' : 'fiscal'} · {resumo.equipe.grupos} grupo{resumo.equipe.grupos !== 1 ? 's' : ''}</p>
                        )}
                      </>
                    )}
                  </button>

                  <button onClick={() => setActiveTab('Ocorrências')} className="text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl px-4 py-3 transition-colors">
                    <p className="text-xs text-gray-400 mb-1">Ocorrências</p>
                    {resumo.ocorrencias === null ? (
                      <p className="text-xl font-semibold text-gray-200">—</p>
                    ) : resumo.ocorrencias.total === 0 ? (
                      <p className="text-xs text-gray-400 mt-1">Nenhuma ocorrência</p>
                    ) : (
                      <p className="text-xl font-semibold text-gray-800">{resumo.ocorrencias.total}</p>
                    )}
                  </button>

                </div>
              </div>

              {/* Cronograma */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-gray-700">Cronograma</h4>
                  <button
                    onClick={() => abrirFormAgenda()}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>

                {showFormAgenda && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Título *</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ex: Reunião de briefing"
                        value={formAgenda.titulo}
                        onChange={e => setFormAgenda(p => ({ ...p, titulo: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Data</label>
                        <input
                          type="date"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formAgenda.data}
                          onChange={e => setFormAgenda(p => ({ ...p, data: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Horário</label>
                        <input
                          type="time"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          value={formAgenda.horario}
                          onChange={e => setFormAgenda(p => ({ ...p, horario: e.target.value }))}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Local / Endereço</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Ex: Rua das Flores, 123 — Centro, São Paulo/SP"
                          value={formAgenda.local}
                          onChange={e => setFormAgenda(p => ({ ...p, local: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Observação</label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Detalhes adicionais..."
                        value={formAgenda.observacao}
                        onChange={e => setFormAgenda(p => ({ ...p, observacao: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={fecharFormAgenda}
                        className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={salvarAgenda}
                        disabled={salvandoAgenda || !formAgenda.titulo.trim()}
                        className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {salvandoAgenda ? 'Salvando...' : editandoAgenda ? 'Salvar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                )}

                {loadingAgenda ? (
                  <p className="text-xs text-gray-400">Carregando...</p>
                ) : agenda.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum item no cronograma.</p>
                ) : (
                  <div className="overflow-x-auto pb-2 -mx-1 px-1">
                    <div className="relative flex gap-0 min-w-max">
                      {/* linha horizontal conectora */}
                      <div className="absolute top-[17px] left-[18px] right-[18px] h-px bg-gray-200 z-0" />

                      {agenda.map((item, idx) => (
                        <div key={item.id} className="flex flex-col items-center w-52 px-2 relative">
                          {/* ponto */}
                          <div className="w-[34px] h-[34px] rounded-full bg-white border-2 border-indigo-300 flex items-center justify-center z-10 shrink-0 shadow-sm">
                            <span className="text-[10px] font-bold text-indigo-500">{idx + 1}</span>
                          </div>

                          {/* card */}
                          <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 w-full shadow-sm">
                            {/* ações */}
                            <div className="flex justify-end gap-1 mb-1">
                              <button
                                onClick={() => abrirFormAgenda(item)}
                                className="text-gray-300 hover:text-indigo-500 transition-colors"
                                title="Editar"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => removerAgenda(item.id)}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                                title="Remover"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {/* data + horário em destaque */}
                            {(item.data || item.horario) && (
                              <div className="flex items-center gap-1 mb-2">
                                <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[11px] font-semibold text-indigo-600">
                                  {item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : ''}
                                  {item.data && item.horario ? ' · ' : ''}
                                  {item.horario ?? ''}
                                </span>
                              </div>
                            )}

                            {/* título */}
                            <p className="text-xs font-semibold text-gray-800 leading-snug">{item.titulo}</p>

                            {/* local / endereço */}
                            {item.local && (
                              <div className="mt-2 flex items-start gap-1 bg-gray-50 rounded-lg px-2 py-1.5">
                                <svg className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[11px] text-gray-600 leading-snug break-words">{item.local}</span>
                              </div>
                            )}

                            {/* observação */}
                            {item.observacao && (
                              <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">{item.observacao}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )
        )}
        {activeTab === 'Períodos' && <TabPeriodos certameId={id!} />}
        {activeTab === 'Locais' && <TabLocaisAplicacao certameId={id!} />}
        {activeTab === 'Candidatos' && <TabCandidatos certameId={id!} />}
        {activeTab === 'Equipes' && <TabEquipes certameId={id!} />}
        {activeTab === 'Ocorrências' && <TabOcorrencias certameId={id!} />}
      </div>
    </div>
  )
}

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


function TabLocais({ certameId }: { certameId: string }) {
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editandoLocal, setEditandoLocal] = useState<string | null>(null)
  const [formLocal, setFormLocal] = useState({
    nome: '', codigo: '', numero_recinto: '', cep: '', endereco: '', bairro: '', cidade: '', uf: '',
    acessivel: false, observacoes: '', responsavel_nome: '', responsavel_contato: '',
  })
  const [salvandoLocal, setSalvandoLocal] = useState(false)
  const [buscandoCepLocal, setBuscandoCepLocal] = useState(false)
  const [equipe, setEquipe] = useState<MembroEquipe[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = () => {
    setLoading(true)
    locaisService.listar({ certame_id: certameId }).then(setLocais).finally(() => setLoading(false))
  }

  useEffect(() => {
    carregar()
    certameEquipeService.listar(certameId).then(setEquipe).catch(() => {})
  }, [certameId])

  const abrirEdicaoLocal = (l: Local) => {
    setFormLocal({
      nome: l.nome,
      codigo: l.codigo || '',
      numero_recinto: l.numero_recinto || '',
      cep: l.cep || '',
      endereco: l.endereco || '',
      bairro: l.bairro || '',
      cidade: l.cidade || '',
      uf: l.uf || '',
      acessivel: l.acessivel,
      observacoes: l.observacoes || '',
      responsavel_nome: l.responsavel_nome || '',
      responsavel_contato: l.responsavel_contato || '',
    })
    setEditandoLocal(l.id)
  }

  const handleCepLocalChange = async (cep: string) => {
    setFormLocal(f => ({ ...f, cep }))
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCepLocal(true)
      const dados = await buscarCep(limpo)
      setBuscandoCepLocal(false)
      if (Object.keys(dados).length) setFormLocal(f => ({ ...f, ...dados }))
    }
  }

  const salvarLocal = async (localId: string) => {
    setSalvandoLocal(true)
    try {
      const atualizado = await locaisService.atualizar(localId, {
        nome: formLocal.nome || undefined,
        codigo: formLocal.codigo || null,
        numero_recinto: formLocal.numero_recinto || null,
        cep: formLocal.cep || null,
        endereco: formLocal.endereco || null,
        bairro: formLocal.bairro || null,
        cidade: formLocal.cidade || null,
        uf: formLocal.uf || null,
        acessivel: formLocal.acessivel,
        observacoes: formLocal.observacoes || null,
        responsavel_nome: formLocal.responsavel_nome || null,
        responsavel_contato: formLocal.responsavel_contato || null,
      })
      setLocais(prev => prev.map(l => l.id === localId ? atualizado : l))
      setEditandoLocal(null)
    } finally {
      setSalvandoLocal(false)
    }
  }

  const desassociar = async (localId: string) => {
    if (!window.confirm('Remover este local do certame?')) return
    await locaisService.atualizarCertame(localId, null)
    setLocais(prev => prev.filter(l => l.id !== localId))
  }

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const importados = await locaisService.importar(file, certameId)
      setLocais(prev => {
        const ids = new Set(prev.map(l => l.id))
        return [...prev, ...importados.filter(l => !ids.has(l.id))]
      })
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">
          Locais de prova{' '}
          <span className="text-gray-400 font-normal text-sm">({locais.length})</span>
        </h3>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={importar} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            Importar planilha
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Adicionar local
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400 text-sm">Carregando...</p>}

      {!loading && locais.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum local de prova vinculado.</p>
          <p className="text-gray-300 text-xs mt-1">Adicione um local existente ou crie um novo.</p>
        </div>
      )}

      {locais.length > 0 && (
        <div className="space-y-2">
          {locais.map(l => (
            <div key={l.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{l.nome}</span>
                    {l.codigo && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{l.codigo}</span>
                    )}
                    {l.numero_recinto && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Recinto {l.numero_recinto}</span>
                    )}
                    {l.acessivel && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Acessível</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                    {l.endereco && <span>{l.endereco}</span>}
                    {l.cidade && <span>{l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
                    {l.cep && <span>CEP {l.cep}</span>}
                    {l.total_salas > 0 && <span>{l.total_salas} sala{l.total_salas !== 1 ? 's' : ''}</span>}
                    {l.capacidade_total > 0 && <span>{l.capacidade_total.toLocaleString('pt-BR')} vagas</span>}
                  </div>
                  {(l.responsavel_nome || l.responsavel_contato) && (
                    <div className="text-xs text-indigo-600 mt-0.5 flex gap-2">
                      {l.responsavel_nome && <span>Responsável: {l.responsavel_nome}</span>}
                      {l.responsavel_contato && <span>· {l.responsavel_contato}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <button
                    onClick={() => editandoLocal === l.id ? setEditandoLocal(null) : abrirEdicaoLocal(l)}
                    className="text-gray-300 hover:text-indigo-500 transition-colors"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => desassociar(l.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-xs"
                  >
                    Remover
                  </button>
                </div>
              </div>

              {editandoLocal === l.id && (
                <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.nome}
                        onChange={e => setFormLocal(f => ({ ...f, nome: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Código</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.codigo}
                        onChange={e => setFormLocal(f => ({ ...f, codigo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nº do Recinto</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.numero_recinto}
                        onChange={e => setFormLocal(f => ({ ...f, numero_recinto: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        CEP {buscandoCepLocal && <span className="text-indigo-400">(buscando...)</span>}
                      </label>
                      <input
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.cep}
                        onChange={e => handleCepLocalChange(e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Endereço</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.endereco}
                        onChange={e => setFormLocal(f => ({ ...f, endereco: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Bairro</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.bairro}
                        onChange={e => setFormLocal(f => ({ ...f, bairro: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.cidade}
                        onChange={e => setFormLocal(f => ({ ...f, cidade: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">UF</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={formLocal.uf}
                        onChange={e => setFormLocal(f => ({ ...f, uf: e.target.value }))}
                      >
                        <option value="">UF</option>
                        {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id={`acess-${l.id}`}
                        checked={formLocal.acessivel}
                        onChange={e => setFormLocal(f => ({ ...f, acessivel: e.target.checked }))}
                        className="rounded"
                      />
                      <label htmlFor={`acess-${l.id}`} className="text-sm text-gray-700">Acessível</label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Responsável pelo local</p>
                      {equipe.length > 0 && (
                        <select
                          className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          defaultValue=""
                          onChange={e => {
                            const membro = equipe.find(m => m.colaborador_id === e.target.value)
                            if (membro) setFormLocal(f => ({ ...f, responsavel_nome: membro.nome, responsavel_contato: membro.celular || '' }))
                          }}
                        >
                          <option value="">Selecionar da equipe...</option>
                          {equipe.map(m => (
                            <option key={m.colaborador_id} value={m.colaborador_id}>{m.nome}{m.funcao ? ` — ${m.funcao}` : ''}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nome</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nome do responsável"
                          value={formLocal.responsavel_nome}
                          onChange={e => setFormLocal(f => ({ ...f, responsavel_nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Contato</label>
                        <input
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Telefone / e-mail"
                          value={formLocal.responsavel_contato}
                          onChange={e => setFormLocal(f => ({ ...f, responsavel_contato: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Observações</label>
                    <textarea
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      value={formLocal.observacoes}
                      onChange={e => setFormLocal(f => ({ ...f, observacoes: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditandoLocal(null)}
                      className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => salvarLocal(l.id)}
                      disabled={salvandoLocal || !formLocal.nome.trim()}
                      className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {salvandoLocal ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AdicionarLocalModal
          certameId={certameId}
          jaAdicionados={locais.map(l => l.id)}
          onClose={() => setShowModal(false)}
          onAdded={l => { setLocais(prev => [...prev, l]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

function AdicionarLocalModal({ certameId, jaAdicionados, onClose, onAdded }: {
  certameId: string
  jaAdicionados: string[]
  onClose: () => void
  onAdded: (l: Local) => void
}) {
  const [aba, setAba] = useState<'selecionar' | 'criar'>('selecionar')
  const [disponiveis, setDisponiveis] = useState<Local[]>([])
  const [loadingDisp, setLoadingDisp] = useState(true)
  const [search, setSearch] = useState('')
  const [vinculando, setVinculando] = useState<string | null>(null)

  const [form, setForm] = useState({
    nome: '', codigo: '', numero_recinto: '', cep: '', endereco: '', bairro: '', cidade: '', uf: '',
    acessivel: false, observacoes: '',
  })
  const [criando, setCriando] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)

  useEffect(() => {
    locaisService.listar({ standalone: true })
      .then(lista => setDisponiveis(lista.filter(l => !jaAdicionados.includes(l.id))))
      .finally(() => setLoadingDisp(false))
  }, [])

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

  const vincular = async (local: Local) => {
    setVinculando(local.id)
    try {
      const atualizado = await locaisService.atualizarCertame(local.id, certameId)
      onAdded(atualizado)
    } finally {
      setVinculando(null)
    }
  }

  const criar = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCriando(true)
    try {
      const local = await locaisService.criar({
        ...form,
        certame_id: certameId,
        total_salas: 0,
        capacidade_total: 0,
      })
      onAdded(local)
    } finally {
      setCriando(false)
    }
  }

  const filtrados = disponiveis.filter(l =>
    !search || l.nome.toLowerCase().includes(search.toLowerCase()) ||
    (l.codigo && l.codigo.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Adicionar local de prova</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div className="flex border-b border-gray-200 -mx-6 px-6">
            {(['selecionar', 'criar'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAba(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  aba === tab
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'selecionar' ? 'Selecionar existente' : 'Criar novo'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {aba === 'selecionar' && (
            <div className="space-y-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome ou código..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {loadingDisp && <p className="text-gray-400 text-sm">Carregando...</p>}
              {!loadingDisp && filtrados.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-gray-400 text-sm">Nenhum local disponível.</p>
                  <p className="text-gray-300 text-xs mt-1">Todos os locais já estão vinculados ou não há locais cadastrados.</p>
                </div>
              )}
              {filtrados.map(l => (
                <div key={l.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{l.nome}</span>
                      {l.codigo && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{l.codigo}</span>}
                      {l.acessivel && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Acessível</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                      {l.cidade && <span>{l.cidade}{l.uf ? `/${l.uf}` : ''}</span>}
                      {l.total_salas > 0 && <span>· {l.total_salas} sala{l.total_salas !== 1 ? 's' : ''}</span>}
                      {l.capacidade_total > 0 && <span>· {l.capacidade_total.toLocaleString('pt-BR')} vagas</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => vincular(l)}
                    disabled={vinculando === l.id}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 shrink-0 ml-3"
                  >
                    {vinculando === l.id ? 'Vinculando...' : 'Vincular'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {aba === 'criar' && (
            <form onSubmit={criar} className="space-y-3">
              <input required placeholder="Nome do local *"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Código"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} />
                <input placeholder="Nº do Recinto"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.numero_recinto} onChange={e => setForm({ ...form, numero_recinto: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  CEP {buscandoCep && <span className="text-indigo-400">(buscando...)</span>}
                </label>
                <input placeholder="00000-000" maxLength={9}
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
                <button type="submit" disabled={criando}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {criando ? 'Criando...' : 'Criar e vincular'}
                </button>
              </div>
            </form>
          )}
        </div>
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

function TabPeriodos({ certameId }: { certameId: string }) {
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [aplicacoes, setAplicacoes] = useState<PeriodoAplicacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      periodosService.listarPeriodos(certameId),
      periodosService.listarCargos(certameId),
    ]).then(([p, c]) => {
      setPeriodos(p)
      setCargos(c)
    }).finally(() => setLoading(false))
    candidatosService.periodos(certameId).then(setAplicacoes).catch(() => {})
  }, [certameId])

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  if (periodos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400 text-sm">Nenhuma divisão de períodos configurada.</p>
        <p className="text-gray-300 text-xs mt-1">Acesse "Divisão de Períodos" no menu para configurar.</p>
      </div>
    )
  }

  const cargosEspera = cargos.filter(c => !c.periodo_id)

  return (
    <div className="space-y-4">
      {periodos.map(p => {
        const lista = cargos.filter(c => c.periodo_id === p.id)
        const totalInsc = lista.reduce((s, c) => s + c.total_inscritos, 0)
        const totalDef = lista.reduce((s, c) => s + c.total_deferidos, 0)
        return (
          <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{p.numero}º</span>
                  <span className="text-sm font-medium text-gray-900">{p.label || `Período ${p.numero}`}</span>
                  {p.data_hora && (
                    <span className="text-xs text-gray-400">
                      {new Date(p.data_hora).toLocaleDateString('pt-BR')}
                      {' · '}
                      {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {lista.length} cargo{lista.length !== 1 ? 's' : ''}
                  {totalInsc > 0 && ` · ${totalInsc.toLocaleString('pt-BR')} inscritos`}
                  {totalDef > 0 && ` · ${totalDef.toLocaleString('pt-BR')} deferidos`}
                </div>
              </div>
              {(() => {
                const diaP = p.data_hora?.split('T')[0]
                const apl = aplicacoes.find(a => a.dia_prova === diaP)
                if (!apl) return null
                return (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-xs text-gray-500">
                      <span className="font-medium">{apl.total.toLocaleString('pt-BR')}</span> candidatos aplicação
                    </span>
                    {apl.horarios.length > 0 && (
                      <span className="text-xs text-gray-500">Horário: <span className="font-medium">{apl.horarios.join(', ')}</span></span>
                    )}
                    {apl.locais.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {apl.locais.length} local{apl.locais.length !== 1 ? 'is' : ''}:{' '}
                        <span className="font-medium">{apl.locais.slice(0, 2).join(', ')}{apl.locais.length > 2 ? ` +${apl.locais.length - 2}` : ''}</span>
                      </span>
                    )}
                  </div>
                )
              })()}
            </div>
            {lista.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {lista.map(c => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                    <span className="text-gray-800">{c.nome}</span>
                    <div className="flex gap-4 text-xs text-gray-400">
                      {c.total_inscritos > 0 && <span>{c.total_inscritos.toLocaleString('pt-BR')} inscritos</span>}
                      {c.total_deferidos > 0 && <span>{c.total_deferidos.toLocaleString('pt-BR')} deferidos</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-xs text-gray-300">Nenhum cargo atribuído.</p>
            )}
          </div>
        )
      })}
      {cargosEspera.length > 0 && (
        <div className="border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <span className="text-sm font-medium text-amber-700">Aguardando atribuição</span>
            <span className="text-xs text-amber-400">{cargosEspera.length} cargo{cargosEspera.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {cargosEspera.map(c => (
              <div key={c.id} className="px-4 py-2.5 text-sm text-gray-600">{c.nome}</div>
            ))}
          </div>
        </div>
      )}
      {aplicacoes.length > 0 && periodos.length === 0 && (
        <div className="space-y-2">
          {aplicacoes.map(apl => (
            <div key={apl.dia_prova} className="border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(apl.dia_prova + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </span>
                  {apl.horarios.length > 0 && (
                    <span className="text-xs text-gray-400">{apl.horarios.join(' / ')}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{apl.total.toLocaleString('pt-BR')} candidatos · {apl.locais.length} local{apl.locais.length !== 1 ? 'is' : ''}</span>
              </div>
              {apl.cargos.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {apl.cargos.map(c => (
                    <span key={c} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tab Locais Aplicação ──────────────────────────────────────────────────────

function _labelPeriodo(p: PeriodoLocal, idx: number): string {
  const parts: string[] = []
  if (p.dia_prova) parts.push(new Date(p.dia_prova + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }))
  if (p.horario) parts.push(p.horario)
  return parts.join(' · ') || `Período ${idx + 1}`
}

function _textoResponsavel(r: Responsavel): string {
  return [r.nome, r.contato, r.obs].filter(Boolean).join(' · ')
}

function TabLocaisAplicacao({ certameId }: { certameId: string }) {
  const [info, setInfo] = useState<CandidatoInfo | null>(null)
  const [locais, setLocais] = useState<LocalAplicacao[]>([])
  const [locaisInfo, setLocaisInfo] = useState<LocalInfo[]>([])
  const [locaisReais, setLocaisReais] = useState<Local[]>([])
  const [equipe, setEquipe] = useState<MembroEquipe[]>([])
  const [grupos, setGrupos] = useState<GrupoFiscais[]>([])
  const [loading, setLoading] = useState(true)
  const [localAberto, setLocalAberto] = useState<string | null>(null)
  const [periodoAberto, setPeriodoAberto] = useState<string | null>(null)

  // address edit
  const [editandoEndereco, setEditandoEndereco] = useState<string | null>(null)
  const [formEndereco, setFormEndereco] = useState({ nome: '', numero_recinto: '', cep: '', endereco: '', bairro: '', cidade: '', uf: '' })
  const [salvandoEndereco, setSalvandoEndereco] = useState(false)
  const [buscandoCepApl, setBuscandoCepApl] = useState(false)

  // responsáveis edit
  const [editandoResponsaveis, setEditandoResponsaveis] = useState<string | null>(null)
  const [editResponsaveis, setEditResponsaveis] = useState<Responsavel[]>([])
  const [salvandoResp, setSalvandoResp] = useState(false)

  // colaboradores edit
  const [editandoColabs, setEditandoColabs] = useState<string | null>(null)
  const [editColabIds, setEditColabIds] = useState<string[]>([])
  const [salvandoColabs, setSalvandoColabs] = useState(false)

  // grupo de fiscais edit
  const [salvandoGrupo, setSalvandoGrupo] = useState<string | null>(null)

  const [salaView, setSalaView] = useState<{ local: string; sala: string; dia_prova: string | null; horario: string | null } | null>(null)
  const [candidatosSala, setCandidatosSala] = useState<Candidato[]>([])
  const [loadingSala, setLoadingSala] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [novaCondicao, setNovaCondicao] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([
      candidatosService.info(certameId),
      candidatosService.locais(certameId),
      candidatosService.locaisInfo(certameId),
      certameEquipeService.listar(certameId),
      locaisService.listar({ certame_id: certameId }),
      gruposFiscaisService.listar(certameId),
    ]).then(([i, l, li, eq, lr, gr]) => { setInfo(i); setLocais(l); setLocaisInfo(li); setEquipe(eq); setLocaisReais(lr); setGrupos(gr) })
      .finally(() => setLoading(false))
  }, [certameId])

  const abrirEditEndereco = (localNome: string) => {
    const lr = locaisReais.find(x => x.nome === localNome)
    setFormEndereco({
      nome: lr?.nome || localNome,
      numero_recinto: lr?.numero_recinto || '',
      cep: lr?.cep || '',
      endereco: lr?.endereco || '',
      bairro: lr?.bairro || '',
      cidade: lr?.cidade || '',
      uf: lr?.uf || '',
    })
    setEditandoEndereco(localNome)
    setEditandoResponsaveis(null)
    setEditandoColabs(null)
  }

  const handleCepAplChange = async (cep: string) => {
    setFormEndereco(f => ({ ...f, cep }))
    const limpo = cep.replace(/\D/g, '')
    if (limpo.length === 8) {
      setBuscandoCepApl(true)
      const dados = await buscarCep(limpo)
      setBuscandoCepApl(false)
      if (Object.keys(dados).length) setFormEndereco(f => ({ ...f, ...dados }))
    }
  }

  const salvarEndereco = async (localNome: string) => {
    const lr = locaisReais.find(x => x.nome === localNome)
    setSalvandoEndereco(true)
    try {
      if (lr) {
        const atualizado = await locaisService.atualizar(lr.id, {
          nome: formEndereco.nome || undefined,
          numero_recinto: formEndereco.numero_recinto || null,
          cep: formEndereco.cep || null,
          endereco: formEndereco.endereco || null,
          bairro: formEndereco.bairro || null,
          cidade: formEndereco.cidade || null,
          uf: formEndereco.uf || null,
        })
        setLocaisReais(prev => prev.map(l => l.id === lr.id ? atualizado : l))
      } else {
        const criado = await locaisService.criar({
          nome: formEndereco.nome || localNome,
          numero_recinto: formEndereco.numero_recinto || undefined,
          cep: formEndereco.cep || undefined,
          endereco: formEndereco.endereco || undefined,
          bairro: formEndereco.bairro || undefined,
          cidade: formEndereco.cidade || undefined,
          uf: formEndereco.uf || undefined,
          certame_id: certameId,
          total_salas: 0,
          capacidade_total: 0,
          acessivel: false,
        })
        setLocaisReais(prev => [...prev, criado])
      }
      setEditandoEndereco(null)
    } finally {
      setSalvandoEndereco(false)
    }
  }

  const abrirEditResponsaveis = (localNome: string) => {
    const li = locaisInfo.find(x => x.local_nome === localNome)
    setEditResponsaveis(li?.responsaveis ? li.responsaveis.map(r => ({ ...r })) : [])
    setEditandoResponsaveis(localNome)
    setEditandoEndereco(null)
    setEditandoColabs(null)
  }

  const salvarResponsaveis = async (localNome: string) => {
    setSalvandoResp(true)
    const li = locaisInfo.find(x => x.local_nome === localNome)
    try {
      const updated = await candidatosService.salvarLocalInfo(certameId, localNome, editResponsaveis, li?.colaboradores_ids ?? [], li?.grupo_fiscais_id)
      setLocaisInfo(prev => {
        const idx = prev.findIndex(x => x.local_nome === localNome)
        return idx >= 0 ? prev.map((x, i) => i === idx ? updated : x) : [...prev, updated]
      })
      setEditandoResponsaveis(null)
    } finally {
      setSalvandoResp(false)
    }
  }

  const abrirEditColabs = (localNome: string) => {
    const li = locaisInfo.find(x => x.local_nome === localNome)
    setEditColabIds(li?.colaboradores_ids ? [...li.colaboradores_ids] : [])
    setEditandoColabs(localNome)
    setEditandoEndereco(null)
    setEditandoResponsaveis(null)
  }

  const salvarColabs = async (localNome: string) => {
    setSalvandoColabs(true)
    const li = locaisInfo.find(x => x.local_nome === localNome)
    try {
      const updated = await candidatosService.salvarLocalInfo(certameId, localNome, li?.responsaveis ?? [], editColabIds, li?.grupo_fiscais_id)
      setLocaisInfo(prev => {
        const idx = prev.findIndex(x => x.local_nome === localNome)
        return idx >= 0 ? prev.map((x, i) => i === idx ? updated : x) : [...prev, updated]
      })
      setEditandoColabs(null)
    } finally {
      setSalvandoColabs(false)
    }
  }

  const salvarGrupoFiscais = async (localNome: string, grupoId: string | null) => {
    setSalvandoGrupo(localNome)
    const li = locaisInfo.find(x => x.local_nome === localNome)
    try {
      const updated = await candidatosService.salvarLocalInfo(certameId, localNome, li?.responsaveis ?? [], li?.colaboradores_ids ?? [], grupoId)
      setLocaisInfo(prev => {
        const idx = prev.findIndex(x => x.local_nome === localNome)
        return idx >= 0 ? prev.map((x, i) => i === idx ? updated : x) : [...prev, updated]
      })
    } finally {
      setSalvandoGrupo(null)
    }
  }

  const abrirSala = async (local: string, sala: string, dia_prova: string | null, horario: string | null) => {
    setSalaView({ local, sala, dia_prova, horario })
    setEditandoEndereco(null)
    setEditandoResponsaveis(null)
    setEditandoColabs(null)
    setLoadingSala(true)
    setEditandoId(null)
    try {
      const params: { local: string; sala: string; dia?: string } = { local, sala }
      if (dia_prova) params.dia = dia_prova
      setCandidatosSala(await candidatosService.listar(certameId, params))
    } finally {
      setLoadingSala(false)
    }
  }

  const salvarCondicao = async (candidatoId: string) => {
    setSalvando(true)
    try {
      const atualizado = await candidatosService.editarCondicao(certameId, candidatoId, novaCondicao || null)
      setCandidatosSala(prev => prev.map(c => c.id === candidatoId ? atualizado : c))
      setEditandoId(null)
      candidatosService.locais(certameId).then(setLocais)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  if (!info?.importado) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 text-sm font-medium">Sem dados de aplicação</p>
        <p className="text-gray-400 text-xs mt-1">Importe os candidatos na aba Candidatos para visualizar os locais.</p>
      </div>
    )
  }

  if (salaView) {
    return (
      <div>
        <button onClick={() => setSalaView(null)} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
          ← {salaView.local}
        </button>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{salaView.sala}</h3>
            {(salaView.dia_prova || salaView.horario) && (
              <p className="text-xs text-gray-400 mt-0.5">
                {salaView.dia_prova ? new Date(salaView.dia_prova + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}
                {salaView.horario ? ` · ${salaView.horario}` : ''}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-400">{candidatosSala.length} candidato{candidatosSala.length !== 1 ? 's' : ''}</span>
        </div>
        {loadingSala ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : (
          <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {candidatosSala.map(c => (
              <div key={c.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 w-14 shrink-0 pt-0.5">{c.numero_inscricao || '—'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{c.nome}</p>
                    <p className="text-xs text-gray-400">{c.vaga || '—'}{c.cpf ? ` · ${c.cpf}` : ''}</p>
                    {editandoId === c.id ? (
                      <div className="mt-2 flex gap-2 items-center">
                        <input
                          autoFocus
                          value={novaCondicao}
                          onChange={e => setNovaCondicao(e.target.value)}
                          placeholder="Descreva a condição especial..."
                          className="flex-1 border border-amber-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <button onClick={() => salvarCondicao(c.id)} disabled={salvando}
                          className="text-xs bg-amber-500 text-white px-2 py-1 rounded-lg hover:bg-amber-600 disabled:opacity-50">
                          {salvando ? '...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                        {c.condicao_especial && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠ {c.condicao_especial}</span>
                        )}
                        <button
                          onClick={() => { setEditandoId(c.id); setNovaCondicao(c.condicao_especial || '') }}
                          className="text-xs text-gray-300 hover:text-indigo-500 transition-colors"
                        >
                          {c.condicao_especial ? 'editar condição' : '+ condição especial'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {locais.map(local => {
        const li = locaisInfo.find(x => x.local_nome === local.local_nome)
        const lr = locaisReais.find(x => x.nome === local.local_nome)
        const isOpen = localAberto === local.local_nome
        const colabsDoLocal = equipe.filter(m => li?.colaboradores_ids?.includes(m.colaborador_id))
        return (
          <div key={local.local_nome} className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Local header */}
            <div
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => {
                setLocalAberto(isOpen ? null : local.local_nome)
                setPeriodoAberto(null)
                if (isOpen) { setEditandoEndereco(null); setEditandoResponsaveis(null); setEditandoColabs(null) }
              }}
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-2 min-w-0">
                  {local.tem_condicao && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Contém condição especial" />}
                  <span className="text-sm font-medium text-gray-900 truncate">{local.local_nome}</span>
                </div>
                {/* summary line: address + colaboradores */}
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0">
                  {lr && (lr.endereco || lr.numero_recinto || lr.bairro || lr.cidade) && (
                    <span className="text-xs text-gray-400">
                      {[lr.endereco, lr.numero_recinto, lr.bairro, lr.cidade && (lr.uf ? `${lr.cidade}/${lr.uf}` : lr.cidade)].filter(Boolean).join(', ')}
                    </span>
                  )}
                  {colabsDoLocal.slice(0, 2).map((m, i) => (
                    <span key={i} className="text-xs text-indigo-600">{m.nome}{m.funcao ? ` — ${m.funcao}` : ''}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">
                  {local.total_salas} sala{local.total_salas !== 1 ? 's' : ''} · {local.total_candidatos.toLocaleString('pt-BR')} candidatos
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {isOpen && (
              <div>
                {/* ── Seção Endereço ── */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Endereço</p>
                    {editandoEndereco !== local.local_nome && (
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditEndereco(local.local_nome) }}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        {lr ? 'Editar' : 'Cadastrar'}
                      </button>
                    )}
                  </div>

                  {editandoEndereco === local.local_nome ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Nome do local</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.nome}
                            onChange={e => setFormEndereco(f => ({ ...f, nome: e.target.value }))}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Nº do Recinto</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.numero_recinto}
                            onChange={e => setFormEndereco(f => ({ ...f, numero_recinto: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">
                            CEP {buscandoCepApl && <span className="text-indigo-400">(buscando...)</span>}
                          </label>
                          <input
                            placeholder="00000-000"
                            maxLength={9}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.cep}
                            onChange={e => handleCepAplChange(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">UF</label>
                          <select
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.uf}
                            onChange={e => setFormEndereco(f => ({ ...f, uf: e.target.value }))}
                          >
                            <option value="">UF</option>
                            {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Endereço</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.endereco}
                            onChange={e => setFormEndereco(f => ({ ...f, endereco: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Bairro</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.bairro}
                            onChange={e => setFormEndereco(f => ({ ...f, bairro: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                          <input
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            value={formEndereco.cidade}
                            onChange={e => setFormEndereco(f => ({ ...f, cidade: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditandoEndereco(null)}
                          className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => salvarEndereco(local.local_nome)}
                          disabled={salvandoEndereco || !formEndereco.nome.trim()}
                          className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {salvandoEndereco ? 'Salvando...' : 'Salvar endereço'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      {lr ? (
                        <>
                          {(lr.endereco || lr.numero_recinto || lr.bairro) && (
                            <p>{[lr.endereco, lr.numero_recinto, lr.bairro].filter(Boolean).join(', ')}</p>
                          )}
                          {(lr.cidade || lr.uf || lr.cep) && (
                            <p>{[lr.cidade, lr.uf].filter(Boolean).join('/')}{lr.cep ? ` — CEP ${lr.cep}` : ''}</p>
                          )}
                          {!lr.numero_recinto && !lr.endereco && !lr.cidade && (
                            <p className="text-gray-300 italic">Endereço não cadastrado</p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-300 italic">Endereço não cadastrado</p>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Seção Responsáveis / Contatos ── */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsáveis / Contatos</p>
                    {editandoResponsaveis !== local.local_nome && (
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditResponsaveis(local.local_nome) }}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {editandoResponsaveis === local.local_nome ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        {equipe.length > 0 && (
                          <select
                            defaultValue=""
                            onChange={e => {
                              const membro = equipe.find(m => m.colaborador_id === e.target.value)
                              if (!membro) return
                              setEditResponsaveis(prev => [...prev, { nome: membro.nome, contato: membro.celular || '', obs: '' }])
                              e.target.value = ''
                            }}
                            className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">+ Da equipe...</option>
                            {equipe.map(m => (
                              <option key={m.colaborador_id} value={m.colaborador_id}>
                                {m.nome}{m.funcao ? ` (${m.funcao})` : ''}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => setEditResponsaveis(prev => [...prev, { nome: '', contato: '', obs: '' }])}
                          className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2 py-1 bg-white"
                        >
                          + Adicionar
                        </button>
                      </div>
                      {editResponsaveis.length === 0 && (
                        <p className="text-xs text-gray-300 text-center py-2">Nenhum responsável.</p>
                      )}
                      <div className="space-y-1.5">
                        {editResponsaveis.map((r, idx) => (
                          <div key={idx} className="flex gap-1.5 items-center">
                            <input
                              placeholder="Nome"
                              value={r.nome}
                              onChange={e => setEditResponsaveis(prev => prev.map((x, i) => i === idx ? { ...x, nome: e.target.value } : x))}
                              className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              placeholder="Contato"
                              value={r.contato}
                              onChange={e => setEditResponsaveis(prev => prev.map((x, i) => i === idx ? { ...x, contato: e.target.value } : x))}
                              className="w-36 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <input
                              placeholder="Observação"
                              value={r.obs || ''}
                              onChange={e => setEditResponsaveis(prev => prev.map((x, i) => i === idx ? { ...x, obs: e.target.value } : x))}
                              className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              onClick={() => setEditResponsaveis(prev => prev.filter((_, i) => i !== idx))}
                              className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditandoResponsaveis(null)}
                          className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => salvarResponsaveis(local.local_nome)}
                          disabled={salvandoResp}
                          className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {salvandoResp ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : li?.responsaveis?.length ? (
                    <div className="space-y-0.5">
                      {li.responsaveis.map((r, i) => (
                        <p key={i} className="text-xs text-gray-700">{_textoResponsavel(r)}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Nenhum responsável cadastrado.</p>
                  )}
                </div>

                {/* ── Seção Colaboradores ── */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Colaboradores</p>
                    {editandoColabs !== local.local_nome && (
                      <button
                        onClick={e => { e.stopPropagation(); abrirEditColabs(local.local_nome) }}
                        className="text-xs text-indigo-500 hover:text-indigo-700"
                      >
                        Editar
                      </button>
                    )}
                  </div>

                  {editandoColabs === local.local_nome ? (
                    <div className="space-y-2">
                      {equipe.length > 0 && (
                        <select
                          value=""
                          onChange={e => {
                            const id = e.target.value
                            if (id && !editColabIds.includes(id)) setEditColabIds(prev => [...prev, id])
                            e.target.value = ''
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">+ Adicionar da equipe...</option>
                          {equipe.filter(m => !editColabIds.includes(m.colaborador_id)).map(m => (
                            <option key={m.colaborador_id} value={m.colaborador_id}>
                              {m.nome}{m.funcao ? ` — ${m.funcao}` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                      {editColabIds.length === 0 && (
                        <p className="text-xs text-gray-300 text-center py-2">Nenhum colaborador alocado.</p>
                      )}
                      <div className="space-y-1">
                        {editColabIds.map(cid => {
                          const m = equipe.find(e => e.colaborador_id === cid)
                          return (
                            <div key={cid} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5">
                              <div>
                                <span className="text-xs text-gray-800">{m?.nome || cid}</span>
                                {m?.funcao && <span className="text-xs text-gray-400 ml-1">— {m.funcao}</span>}
                              </div>
                              <button
                                onClick={() => setEditColabIds(prev => prev.filter(x => x !== cid))}
                                className="text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setEditandoColabs(null)}
                          className="flex-1 border border-gray-300 rounded-lg py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => salvarColabs(local.local_nome)}
                          disabled={salvandoColabs}
                          className="flex-1 bg-indigo-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {salvandoColabs ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  ) : colabsDoLocal.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {colabsDoLocal.map(m => (
                        <span key={m.colaborador_id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                          {m.nome}{m.funcao ? ` — ${m.funcao}` : ''}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-300 italic">Nenhum colaborador alocado.</p>
                  )}
                </div>

                {/* ── Grupo de Fiscais ── */}
                <div className="px-4 py-3 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo de Fiscais</p>
                  </div>
                  {(() => {
                    const grupoVinculado = grupos.find(g => g.id === li?.grupo_fiscais_id)
                    return (
                      <div className="flex items-center gap-2">
                        <select
                          value={li?.grupo_fiscais_id ?? ''}
                          disabled={salvandoGrupo === local.local_nome}
                          onChange={e => salvarGrupoFiscais(local.local_nome, e.target.value || null)}
                          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">— Nenhum grupo vinculado —</option>
                          {grupos.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.nome} ({g.fiscais.length} fiscal{g.fiscais.length !== 1 ? 'is' : ''})
                            </option>
                          ))}
                        </select>
                        {salvandoGrupo === local.local_nome && (
                          <span className="text-xs text-gray-400">Salvando…</span>
                        )}
                        {grupoVinculado && salvandoGrupo !== local.local_nome && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {grupoVinculado.fiscais.length} {grupoVinculado.fiscais.length !== 1 ? 'fiscais' : 'fiscal'}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  {grupos.length === 0 && (
                    <p className="text-xs text-gray-300 italic mt-1">Nenhum grupo criado. Crie grupos na aba Equipes.</p>
                  )}
                </div>

                {/* ── Períodos ── */}
                <div className="divide-y divide-gray-100">
                  {local.periodos.map((periodo, pidx) => {
                    const periodoKey = `${local.local_nome}|${periodo.dia_prova}|${periodo.horario}`
                    const esteAberto = periodoAberto === periodoKey
                    return (
                      <div key={periodoKey}>
                        <button
                          className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors text-left bg-white"
                          onClick={() => setPeriodoAberto(esteAberto ? null : periodoKey)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {periodo.tem_condicao && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                            <span className="text-sm font-medium text-gray-700">{_labelPeriodo(periodo, pidx)}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-xs text-gray-400">
                              {periodo.salas.length} sala{periodo.salas.length !== 1 ? 's' : ''} · {periodo.total.toLocaleString('pt-BR')} candidatos
                            </span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${esteAberto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {esteAberto && (
                          <div className="bg-gray-50 divide-y divide-gray-100">
                            {periodo.salas.map(sala => (
                              <button
                                key={sala.sala}
                                className="w-full px-7 py-2.5 flex items-center justify-between hover:bg-indigo-50 transition-colors text-left"
                                onClick={() => abrirSala(local.local_nome, sala.sala, periodo.dia_prova, periodo.horario)}
                              >
                                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                                  {sala.tem_condicao && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                                  <span className="text-sm text-gray-800">{sala.sala}</span>
                                  {sala.cargos.map(cargo => (
                                    <span key={cargo} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">{cargo}</span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-xs text-gray-400">{sala.total} candidatos</span>
                                  <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tab Equipes ───────────────────────────────────────────────────────────────

const STATUS_EQUIPE_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  inativo: 'Inativo',
}
const STATUS_EQUIPE_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  ativo: 'bg-green-100 text-green-700',
  inativo: 'bg-gray-100 text-gray-500',
}

function TabEquipes({ certameId }: { certameId: string }) {
  const [equipe, setEquipe] = useState<MembroEquipe[]>([])
  const [grupos, setGrupos] = useState<GrupoFiscais[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showNovoGrupo, setShowNovoGrupo] = useState(false)
  const [nomeNovoGrupo, setNomeNovoGrupo] = useState('')
  const [criandoGrupo, setCriandoGrupo] = useState(false)
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [modalFiscal, setModalFiscal] = useState<{ grupoId: string; fiscal?: FiscalGrupo } | null>(null)
  const importRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const carregar = async () => {
    setLoading(true)
    try {
      const [eq, gr] = await Promise.all([
        certameEquipeService.listar(certameId),
        gruposFiscaisService.listar(certameId),
      ])
      setEquipe(eq)
      setGrupos(gr)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [certameId])

  const desvincular = async (membro: MembroEquipe) => {
    if (!window.confirm(`Remover ${membro.nome} da equipe?`)) return
    await certameEquipeService.desvincular(membro.colaborador_id, certameId)
    setEquipe(prev => prev.filter(m => m.id !== membro.id))
  }

  const criarGrupo = async () => {
    if (!nomeNovoGrupo.trim()) return
    setCriandoGrupo(true)
    try {
      const novo = await gruposFiscaisService.criar(certameId, nomeNovoGrupo.trim())
      setGrupos(prev => [...prev, novo])
      setGrupoAberto(novo.id)
      setNomeNovoGrupo('')
      setShowNovoGrupo(false)
    } finally {
      setCriandoGrupo(false)
    }
  }

  const deletarGrupo = async (grupo: GrupoFiscais) => {
    if (!window.confirm(`Remover o grupo "${grupo.nome}" e todos os seus fiscais?`)) return
    await gruposFiscaisService.deletar(certameId, grupo.id)
    setGrupos(prev => prev.filter(g => g.id !== grupo.id))
    if (grupoAberto === grupo.id) setGrupoAberto(null)
  }

  const removerFiscal = async (grupoId: string, fiscal: FiscalGrupo) => {
    if (!window.confirm(`Remover ${fiscal.nome}?`)) return
    await gruposFiscaisService.removerFiscal(certameId, grupoId, fiscal.id)
    setGrupos(prev => prev.map(g =>
      g.id === grupoId ? { ...g, fiscais: g.fiscais.filter(f => f.id !== fiscal.id) } : g
    ))
  }

  const handleImportar = async (grupoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const res = await gruposFiscaisService.importar(certameId, grupoId, file)
      const atualizado = await gruposFiscaisService.listar(certameId)
      setGrupos(atualizado)
      alert(`${res.importados} fiscal(is) importado(s) com sucesso.`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || 'Erro ao importar planilha')
    } finally {
      e.target.value = ''
    }
  }

  const onFiscalSalvo = (grupoId: string, fiscal: FiscalGrupo, editando: boolean) => {
    setGrupos(prev => prev.map(g => {
      if (g.id !== grupoId) return g
      if (editando) return { ...g, fiscais: g.fiscais.map(f => f.id === fiscal.id ? fiscal : f) }
      return { ...g, fiscais: [...g.fiscais, fiscal] }
    }))
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
    <div className="space-y-8">
      {/* ── Equipe (coordenadores) ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Equipe{' '}
            <span className="text-gray-400 font-normal text-sm">({equipe.length} membro{equipe.length !== 1 ? 's' : ''})</span>
          </h3>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            + Adicionar membro
          </button>
        </div>

        {equipe.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-gray-400 text-sm">Nenhum membro na equipe deste certame.</p>
            <p className="text-gray-300 text-xs mt-1">Vincule colaboradores existentes ou cadastre novos.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {equipe.map(m => (
              <div key={m.id} className="border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{m.nome}</span>
                    {m.funcao && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{m.funcao}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_EQUIPE_COLOR[m.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_EQUIPE_LABEL[m.status] || m.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-3 flex-wrap">
                    {m.celular && <span>{m.celular}</span>}
                    {m.email && <span>{m.email}</span>}
                    {m.cpf && <span>CPF {m.cpf}</span>}
                  </div>
                </div>
                <button onClick={() => desvincular(m)} className="text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0">
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Grupos de Fiscais ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">
            Grupos de Fiscais{' '}
            <span className="text-gray-400 font-normal text-sm">({grupos.length} grupo{grupos.length !== 1 ? 's' : ''})</span>
          </h3>
          <button
            onClick={() => setShowNovoGrupo(true)}
            className="border border-indigo-300 text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-50"
          >
            + Novo grupo
          </button>
        </div>

        {/* form novo grupo inline */}
        {showNovoGrupo && (
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl px-4 py-3 mb-3 flex gap-2 items-center">
            <input
              autoFocus
              value={nomeNovoGrupo}
              onChange={e => setNomeNovoGrupo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criarGrupo(); if (e.key === 'Escape') { setShowNovoGrupo(false); setNomeNovoGrupo('') } }}
              placeholder="Nome do grupo (ex: Grupo A, Local Norte…)"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button onClick={criarGrupo} disabled={criandoGrupo || !nomeNovoGrupo.trim()}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {criandoGrupo ? 'Criando…' : 'Criar'}
            </button>
            <button onClick={() => { setShowNovoGrupo(false); setNomeNovoGrupo('') }}
              className="text-gray-400 hover:text-gray-600 text-sm px-2">
              Cancelar
            </button>
          </div>
        )}

        {grupos.length === 0 && !showNovoGrupo && (
          <div className="py-6 text-center">
            <p className="text-gray-400 text-sm">Nenhum grupo de fiscais criado.</p>
            <p className="text-gray-300 text-xs mt-1">Cada grupo será vinculado a um local na aba Locais.</p>
          </div>
        )}

        <div className="space-y-3">
          {grupos.map(grupo => (
            <div key={grupo.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* cabeçalho do grupo */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 select-none"
                onClick={() => setGrupoAberto(grupoAberto === grupo.id ? null : grupo.id)}
              >
                <div className="flex items-center gap-3">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${grupoAberto === grupo.id ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-800 text-sm">{grupo.nome}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {grupo.fiscais.length} {grupo.fiscais.length !== 1 ? 'fiscais' : 'fiscal'}
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    ref={el => { importRefs.current[grupo.id] = el }}
                    onChange={e => handleImportar(grupo.id, e)}
                  />
                  <button
                    onClick={() => importRefs.current[grupo.id]?.click()}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                  >
                    Importar planilha
                  </button>
                  <button
                    onClick={() => setModalFiscal({ grupoId: grupo.id })}
                    className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-2.5 py-1 hover:bg-indigo-50"
                  >
                    + Fiscal
                  </button>
                  <button
                    onClick={() => deletarGrupo(grupo)}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors px-1"
                  >
                    Excluir grupo
                  </button>
                </div>
              </div>

              {/* lista de fiscais expandida */}
              {grupoAberto === grupo.id && (
                <div className="border-t border-gray-100">
                  {grupo.fiscais.length === 0 ? (
                    <p className="py-5 text-center text-gray-400 text-xs">Nenhum fiscal neste grupo. Adicione manualmente ou importe uma planilha.</p>
                  ) : (
                    <>
                      <div className="divide-y divide-gray-100">
                        {grupo.fiscais.map(f => (
                          <div key={f.id} className="px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                            {/* nome + tags */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800 truncate">{f.nome}</span>
                                {f.funcao && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full whitespace-nowrap">{f.funcao}</span>}
                                {f.periodo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">{f.periodo}</span>}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                {f.celular && <span className="text-xs text-gray-400">{f.celular}</span>}
                                {f.cpf && <span className="text-xs text-gray-400">CPF {f.cpf}</span>}
                                {f.nascimento && <span className="text-xs text-gray-400">Nasc. {new Date(f.nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                              </div>
                            </div>
                            {/* pagamento */}
                            {f.pagamento && (
                              <span className="text-sm font-medium text-emerald-600 whitespace-nowrap shrink-0">{f.pagamento}</span>
                            )}
                            {/* ações */}
                            <div className="flex gap-3 shrink-0">
                              <button onClick={() => setModalFiscal({ grupoId: grupo.id, fiscal: f })} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors">
                                Editar
                              </button>
                              <button onClick={() => removerFiscal(grupo.id, f)} className="text-xs text-gray-300 hover:text-red-400 transition-colors">
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* preview do formato da planilha quando vazio */}
                  {grupo.fiscais.length === 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Formato da planilha de importação</p>
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="text-xs w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              {['NOME', 'CPF', 'NASCIMENTO', 'CELULAR', 'FUNÇÃO', 'PERÍODO', 'PAGAMENTO', 'OBSERVAÇÃO'].map((col, i) => (
                                <th key={col} className={`px-3 py-1.5 font-semibold text-left border-b border-gray-100 whitespace-nowrap ${i === 0 ? 'text-indigo-600' : 'text-gray-500'}`}>
                                  {col}{i === 0 && <span className="ml-1 text-indigo-300 font-normal">(obrig.)</span>}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="px-3 py-1.5 text-gray-600 font-medium">Maria Silva</td>
                              <td className="px-3 py-1.5 text-gray-400">123.456.789-00</td>
                              <td className="px-3 py-1.5 text-gray-400">12/03/1990</td>
                              <td className="px-3 py-1.5 text-gray-400">(11) 99999-0000</td>
                              <td className="px-3 py-1.5 text-gray-400">Fiscal de Sala</td>
                              <td className="px-3 py-1.5 text-gray-400">Manhã</td>
                              <td className="px-3 py-1.5 text-gray-400">R$ 150,00</td>
                              <td className="px-3 py-1.5 text-gray-400">—</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <AdicionarMembroModal
          certameId={certameId}
          jaVinculados={equipe.map(m => m.colaborador_id)}
          onClose={() => setShowModal(false)}
          onAdded={() => { carregar(); setShowModal(false) }}
        />
      )}

      {modalFiscal && (
        <ModalFiscal
          certameId={certameId}
          grupoId={modalFiscal.grupoId}
          fiscal={modalFiscal.fiscal}
          onClose={() => setModalFiscal(null)}
          onSalvo={(f, editando) => { onFiscalSalvo(modalFiscal.grupoId, f, editando); setModalFiscal(null) }}
        />
      )}
    </div>
  )
}

function ModalFiscal({ certameId, grupoId, fiscal, onClose, onSalvo }: {
  certameId: string
  grupoId: string
  fiscal?: FiscalGrupo
  onClose: () => void
  onSalvo: (f: FiscalGrupo, editando: boolean) => void
}) {
  const editando = !!fiscal
  const [form, setForm] = useState<FiscalGrupoPayload>({
    nome: fiscal?.nome ?? '',
    cpf: fiscal?.cpf ?? '',
    nascimento: fiscal?.nascimento ?? '',
    celular: fiscal?.celular ?? '',
    funcao: fiscal?.funcao ?? '',
    periodo: fiscal?.periodo ?? '',
    observacao: fiscal?.observacao ?? '',
    pagamento: fiscal?.pagamento ?? 'R$ ',
  })
  const [salvando, setSalvando] = useState(false)

  const set = (field: keyof FiscalGrupoPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value || null }))

  const salvar = async () => {
    if (!form.nome?.trim()) return
    setSalvando(true)
    const payload: FiscalGrupoPayload = {
      nome: form.nome,
      cpf: form.cpf || null,
      nascimento: form.nascimento || null,
      celular: form.celular || null,
      funcao: form.funcao || null,
      periodo: form.periodo || null,
      observacao: form.observacao || null,
      pagamento: form.pagamento || null,
    }
    try {
      let f: FiscalGrupo
      if (editando && fiscal) {
        f = await gruposFiscaisService.atualizarFiscal(certameId, grupoId, fiscal.id, payload)
      } else {
        f = await gruposFiscaisService.adicionarFiscal(certameId, grupoId, payload)
      }
      onSalvo(f, editando)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{editando ? 'Editar fiscal' : 'Adicionar fiscal'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome <span className="text-red-400">*</span></label>
            <input value={form.nome ?? ''} onChange={set('nome')} placeholder="Nome completo"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CPF</label>
              <input value={form.cpf ?? ''} onChange={set('cpf')} placeholder="000.000.000-00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nascimento</label>
              <input type="date" value={form.nascimento ?? ''} onChange={set('nascimento')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
              <input value={form.celular ?? ''} onChange={set('celular')} placeholder="(00) 00000-0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Função</label>
              <input value={form.funcao ?? ''} onChange={set('funcao')} placeholder="Ex: Fiscal de sala"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Período</label>
              <input value={form.periodo ?? ''} onChange={set('periodo')} placeholder="Ex: Manhã, Tarde"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
              <input value={form.pagamento ?? ''} onChange={set('pagamento')} placeholder="Ex: R$ 150,00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
            <textarea value={form.observacao ?? ''} onChange={set('observacao')} rows={2} placeholder="Opcional"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">Cancelar</button>
          <button onClick={salvar} disabled={salvando || !form.nome?.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium">
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AdicionarMembroModal({ certameId, jaVinculados, onClose, onAdded }: {
  certameId: string
  jaVinculados: string[]
  onClose: () => void
  onAdded: () => void
}) {
  const [aba, setAba] = useState<'vincular' | 'novo'>('vincular')
  const [todos, setTodos] = useState<ColaboradorAdmin[]>([])
  const [loadingTodos, setLoadingTodos] = useState(true)
  const [search, setSearch] = useState('')
  const [selecionado, setSelecionado] = useState<ColaboradorAdmin | null>(null)
  const [funcaoVincular, setFuncaoVincular] = useState('')
  const [vinculando, setVinculando] = useState(false)

  const [formNovo, setFormNovo] = useState({ nome: '', cpf: '', celular: '' })
  const [funcaoNovo, setFuncaoNovo] = useState('')
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    colaboradoresAdminService.listar()
      .then(lista => setTodos(lista.filter(c => !jaVinculados.includes(c.id))))
      .finally(() => setLoadingTodos(false))
  }, [])

  const filtrados = todos.filter(c =>
    !search ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf && c.cpf.includes(search)) ||
    (c.celular && c.celular.includes(search))
  )

  const vincular = async () => {
    if (!selecionado) return
    setVinculando(true)
    try {
      await certameEquipeService.vincular(selecionado.id, certameId, funcaoVincular || undefined)
      onAdded()
    } finally {
      setVinculando(false)
    }
  }

  const criarEVincular = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCriando(true)
    try {
      const colab = await colaboradoresAdminService.preCadastrar(formNovo)
      await certameEquipeService.vincular(colab.id, certameId, funcaoNovo || undefined)
      onAdded()
    } finally {
      setCriando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Adicionar membro à equipe</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>
          <div className="flex border-b border-gray-200 -mx-6 px-6">
            {(['vincular', 'novo'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAba(tab)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  aba === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'vincular' ? 'Colaborador existente' : 'Novo colaborador'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {aba === 'vincular' && (
            <div className="space-y-3">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, CPF ou telefone..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {loadingTodos && <p className="text-gray-400 text-sm">Carregando...</p>}
              {!loadingTodos && filtrados.length === 0 && (
                <p className="text-gray-400 text-sm py-4 text-center">Nenhum colaborador disponível.</p>
              )}
              {filtrados.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelecionado(s => s?.id === c.id ? null : c)}
                  className={`border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    selecionado?.id === c.id
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{c.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_EQUIPE_COLOR[c.status] || ''}`}>
                      {STATUS_EQUIPE_LABEL[c.status] || c.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 flex gap-2">
                    {c.celular && <span>{c.celular}</span>}
                    {c.cpf && <span>· {c.cpf}</span>}
                  </div>
                </div>
              ))}

              {selecionado && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Função neste certame (opcional)</label>
                    <input
                      value={funcaoVincular}
                      onChange={e => setFuncaoVincular(e.target.value)}
                      placeholder="ex: Coordenador de local, Fiscal..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                      Cancelar
                    </button>
                    <button
                      onClick={vincular}
                      disabled={vinculando}
                      className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {vinculando ? 'Vinculando...' : `Vincular ${selecionado.nome}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {aba === 'novo' && (
            <form onSubmit={criarEVincular} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formNovo.nome}
                  onChange={e => setFormNovo(f => ({ ...f, nome: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">CPF *</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formNovo.cpf}
                  onChange={e => setFormNovo(f => ({ ...f, cpf: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Celular *</label>
                <input
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formNovo.celular}
                  onChange={e => setFormNovo(f => ({ ...f, celular: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Função neste certame (opcional)</label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="ex: Coordenador de local, Fiscal..."
                  value={funcaoNovo}
                  onChange={e => setFuncaoNovo(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 border border-gray-300 rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={criando}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {criando ? 'Cadastrando...' : 'Cadastrar e vincular'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab Candidatos ────────────────────────────────────────────────────────────

function TabCandidatos({ certameId }: { certameId: string }) {
  const [info, setInfo] = useState<CandidatoInfo | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroLocal, setFiltroLocal] = useState('')
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const [inf, cands, locs] = await Promise.all([
        candidatosService.info(certameId),
        candidatosService.listar(certameId),
        candidatosService.locais(certameId),
      ])
      setInfo(inf)
      setCandidatos(cands)
      setLocaisDisponiveis(locs.map(l => l.local_nome))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [certameId])

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true)
    try {
      await candidatosService.importar(certameId, file)
      await carregar()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      alert(msg || 'Erro ao importar arquivo')
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const handleRemover = async () => {
    if (!window.confirm('Remover todos os candidatos desta importação?')) return
    setRemovendo(true)
    try {
      await candidatosService.remover(certameId)
      await carregar()
    } finally {
      setRemovendo(false)
    }
  }

  const filtrados = candidatos.filter(c => {
    if (filtroLocal && c.local_nome !== filtroLocal) return false
    if (busca) {
      const b = busca.toLowerCase()
      return c.nome.toLowerCase().includes(b) || (c.numero_inscricao || '').includes(b)
    }
    return true
  })

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  if (!info?.importado) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-gray-700 font-medium mb-1">Nenhuma importação realizada</p>
        <p className="text-gray-400 text-sm mb-5">Importe uma planilha (.xlsx, .xls ou .csv) com os candidatos do certame</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importando}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 mb-8">
          {importando ? 'Importando...' : 'Importar planilha'}
        </button>

        <div className="text-left mt-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Formato esperado da planilha</p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['INSCRIÇÃO', 'NOME', 'CPF', 'VAGA', 'DIA DA PROVA', 'HORÁRIO', 'LOCAL', 'SALA', 'CONDIÇÃO ESPECIAL'].map((col, i) => (
                    <th key={col} className={`px-3 py-2 font-semibold text-gray-600 text-left border-b border-gray-200 whitespace-nowrap ${i === 1 ? 'text-indigo-600' : ''}`}>
                      {col}{i === 1 && <span className="ml-1 text-indigo-400 font-normal">(obrig.)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="bg-white">
                  <td className="px-3 py-2 text-gray-500">100001</td>
                  <td className="px-3 py-2 text-gray-700 font-medium">Ana Paula Souza</td>
                  <td className="px-3 py-2 text-gray-500">123.456.789-00</td>
                  <td className="px-3 py-2 text-gray-500">Analista</td>
                  <td className="px-3 py-2 text-gray-500">15/06/2025</td>
                  <td className="px-3 py-2 text-gray-500">08:00</td>
                  <td className="px-3 py-2 text-gray-500">Escola Estadual X</td>
                  <td className="px-3 py-2 text-gray-500">101</td>
                  <td className="px-3 py-2 text-gray-500">—</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-500">100002</td>
                  <td className="px-3 py-2 text-gray-700 font-medium">Carlos Eduardo Lima</td>
                  <td className="px-3 py-2 text-gray-500">987.654.321-00</td>
                  <td className="px-3 py-2 text-gray-500">Analista</td>
                  <td className="px-3 py-2 text-gray-500">15/06/2025</td>
                  <td className="px-3 py-2 text-gray-500">08:00</td>
                  <td className="px-3 py-2 text-gray-500">Escola Estadual X</td>
                  <td className="px-3 py-2 text-gray-500">102</td>
                  <td className="px-3 py-2 text-gray-500 italic">Tempo adicional</td>
                </tr>
                <tr className="bg-white">
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                  <td className="px-3 py-2 text-gray-300">…</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2">Datas aceitas: DD/MM/AAAA · Colunas opcionais podem ser omitidas · A coluna NOME é obrigatória</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{info.total.toLocaleString('pt-BR')} candidatos</span>
          {info.com_condicao > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {info.com_condicao} com condição especial
            </span>
          )}
          {info.importado_em && (
            <span className="text-xs text-gray-400">
              Importado em {new Date(info.importado_em).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={importando}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50">
            {importando ? 'Importando...' : 'Reimportar'}
          </button>
          <button onClick={handleRemover} disabled={removendo}
            className="border border-red-200 text-red-500 rounded-lg px-3 py-1.5 text-xs hover:bg-red-50 disabled:opacity-50">
            {removendo ? 'Removendo...' : 'Remover importação'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou inscrição..."
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-48"
        />
        {locaisDisponiveis.length > 1 && (
          <select value={filtroLocal} onChange={e => setFiltroLocal(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os locais</option>
            {locaisDisponiveis.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-2">{filtrados.length.toLocaleString('pt-BR')} resultado{filtrados.length !== 1 ? 's' : ''}</p>
      <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        {filtrados.length === 0 ? (
          <p className="py-8 text-center text-gray-400 text-sm">Nenhum candidato encontrado.</p>
        ) : filtrados.slice(0, 200).map(c => (
          <div key={c.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
            <span className="text-xs text-gray-400 w-14 shrink-0">{c.numero_inscricao || '—'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{c.nome}</p>
              <p className="text-xs text-gray-400">
                {c.local_nome || ''}
                {c.sala ? ` · ${c.sala}` : ''}
                {c.vaga ? ` · ${c.vaga}` : ''}
              </p>
            </div>
            {c.condicao_especial && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 max-w-[160px] truncate" title={c.condicao_especial}>
                ⚠ {c.condicao_especial}
              </span>
            )}
          </div>
        ))}
      </div>
      {filtrados.length > 200 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Mostrando 200 de {filtrados.length.toLocaleString('pt-BR')}. Use os filtros para refinar.
        </p>
      )}
    </div>
  )
}

// ── Ocorrências ───────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<OcorrenciaTipo, string> = {
  candidato: 'Candidato',
  fiscal: 'Fiscal',
  local: 'Local',
  material: 'Material',
  outros: 'Outros',
}

const TIPO_COLOR: Record<OcorrenciaTipo, string> = {
  candidato: 'bg-blue-100 text-blue-700',
  fiscal: 'bg-purple-100 text-purple-700',
  local: 'bg-orange-100 text-orange-700',
  material: 'bg-amber-100 text-amber-700',
  outros: 'bg-gray-100 text-gray-600',
}

function fmtTamanho(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtData(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TabOcorrencias({ certameId }: { certameId: string }) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<Ocorrencia | null>(null)

  const [tipo, setTipo] = useState<OcorrenciaTipo>('candidato')
  const [descricao, setDescricao] = useState('')
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<Candidato | null>(null)
  const [buscaInscricao, setBuscaInscricao] = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<Candidato[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [uploadingFor, setUploadingFor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)

  const carregar = () => {
    setLoading(true)
    ocorrenciasService.listar(certameId).then(setOcorrencias).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [certameId])

  useEffect(() => {
    if (buscaInscricao.length < 2) { setResultadosBusca([]); setMostrarDropdown(false); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const res = await candidatosService.listar(certameId, { busca: buscaInscricao })
        setResultadosBusca(res.slice(0, 8))
        setMostrarDropdown(res.length > 0)
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [buscaInscricao, certameId])

  const abrirFormNovo = () => {
    setEditando(null)
    setTipo('candidato')
    setDescricao('')
    setCandidatoSelecionado(null)
    setBuscaInscricao('')
    setResultadosBusca([])
    setMostrarDropdown(false)
    setMostrarForm(true)
  }

  const abrirFormEdicao = (o: Ocorrencia) => {
    setEditando(o)
    setTipo(o.tipo)
    setDescricao(o.descricao)
    setCandidatoSelecionado(null)
    setBuscaInscricao('')
    setResultadosBusca([])
    setMostrarDropdown(false)
    setMostrarForm(true)
  }

  const selecionarCandidato = (c: Candidato) => {
    setCandidatoSelecionado(c)
    setBuscaInscricao('')
    setResultadosBusca([])
    setMostrarDropdown(false)
  }

  const salvar = async () => {
    if (!descricao.trim()) return
    setSalvando(true)
    try {
      if (editando) {
        const updated = await ocorrenciasService.atualizar(certameId, editando.id, {
          tipo,
          descricao,
          ...(candidatoSelecionado ? { candidato_certame_id: candidatoSelecionado.id } : {}),
        })
        setOcorrencias(prev => prev.map(o => o.id === updated.id ? updated : o))
      } else {
        const created = await ocorrenciasService.criar(certameId, {
          tipo,
          descricao,
          candidato_certame_id: candidatoSelecionado?.id ?? null,
        })
        setOcorrencias(prev => [created, ...prev])
      }
      setMostrarForm(false)
    } finally {
      setSalvando(false)
    }
  }

  const deletar = async (id: string) => {
    if (!window.confirm('Excluir esta ocorrência e todos os seus anexos?')) return
    setDeletando(id)
    try {
      await ocorrenciasService.deletar(certameId, id)
      setOcorrencias(prev => prev.filter(o => o.id !== id))
    } finally {
      setDeletando(null)
    }
  }

  const triggerUpload = (ocorrenciaId: string) => {
    setUploadTarget(ocorrenciaId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    e.target.value = ''
    setUploadingFor(uploadTarget)
    try {
      const anexo = await ocorrenciasService.uploadAnexo(certameId, uploadTarget, file)
      setOcorrencias(prev => prev.map(o =>
        o.id === uploadTarget ? { ...o, anexos: [...o.anexos, anexo] } : o
      ))
    } finally {
      setUploadingFor(null)
      setUploadTarget(null)
    }
  }

  const deletarAnexo = async (ocorrenciaId: string, anexoId: string) => {
    await ocorrenciasService.deletarAnexo(certameId, ocorrenciaId, anexoId)
    setOcorrencias(prev => prev.map(o =>
      o.id === ocorrenciaId ? { ...o, anexos: o.anexos.filter(a => a.id !== anexoId) } : o
    ))
  }

  if (loading) return <p className="text-gray-400 text-sm p-4">Carregando...</p>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{ocorrencias.length} ocorrência{ocorrencias.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirFormNovo}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Ocorrência
        </button>
      </div>

      {/* Formulário */}
      {mostrarForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            {editando ? 'Editar ocorrência' : 'Nova ocorrência'}
          </p>

          {/* Tipo */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TIPO_LABEL) as OcorrenciaTipo[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${tipo === t ? TIPO_COLOR[t] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Busca por inscrição */}
          <div className="mb-4 relative">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Candidato (opcional — busque pelo nº de inscrição ou nome)</label>
            {candidatoSelecionado ? (
              <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-indigo-800 truncate">{candidatoSelecionado.nome}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {candidatoSelecionado.numero_inscricao && <span className="text-xs text-indigo-600">Inscrição: {candidatoSelecionado.numero_inscricao}</span>}
                    {candidatoSelecionado.local_nome && <span className="text-xs text-indigo-600">Local: {candidatoSelecionado.local_nome}</span>}
                    {candidatoSelecionado.sala && <span className="text-xs text-indigo-600">Sala: {candidatoSelecionado.sala}</span>}
                    {candidatoSelecionado.dia_prova && <span className="text-xs text-indigo-600">Dia: {new Date(candidatoSelecionado.dia_prova + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                    {candidatoSelecionado.horario && <span className="text-xs text-indigo-600">Horário: {candidatoSelecionado.horario}</span>}
                  </div>
                </div>
                <button onClick={() => setCandidatoSelecionado(null)} className="text-indigo-400 hover:text-indigo-600 shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={buscaInscricao}
                  onChange={e => setBuscaInscricao(e.target.value)}
                  onFocus={() => resultadosBusca.length > 0 && setMostrarDropdown(true)}
                  placeholder="Digite o nº de inscrição ou nome..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
                />
                {buscando && (
                  <svg className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {mostrarDropdown && resultadosBusca.length > 0 && (
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                    {resultadosBusca.map(c => (
                      <button
                        key={c.id}
                        onClick={() => selecionarCandidato(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-800 truncate">{c.nome}</p>
                        <p className="text-xs text-gray-500">
                          {c.numero_inscricao && `Inscrição ${c.numero_inscricao}`}
                          {c.local_nome && ` · ${c.local_nome}`}
                          {c.sala && ` · Sala ${c.sala}`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Descrição */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Descrição <span className="text-red-400">*</span></label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={4}
              placeholder="Descreva a ocorrência com detalhes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando || !descricao.trim()}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
            >
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar ocorrência'}
            </button>
          </div>
        </div>
      )}

      {/* Input de arquivo oculto */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Lista */}
      {ocorrencias.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm font-medium">Nenhuma ocorrência registrada</p>
          <p className="text-gray-400 text-xs mt-1">Clique em "Nova Ocorrência" para registrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ocorrencias.map(o => (
            <div key={o.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${TIPO_COLOR[o.tipo]}`}>
                  {TIPO_LABEL[o.tipo]}
                </span>
                <div className="flex-1 min-w-0">
                  {/* Candidato info */}
                  {o.candidato && (
                    <div className="mb-2 bg-indigo-50 rounded-lg px-3 py-2">
                      <p className="text-sm font-semibold text-indigo-800 truncate">{o.candidato.nome}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {o.candidato.numero_inscricao && <span className="text-xs text-indigo-600">Insc. {o.candidato.numero_inscricao}</span>}
                        {o.candidato.local_nome && <span className="text-xs text-indigo-600">{o.candidato.local_nome}</span>}
                        {o.candidato.sala && <span className="text-xs text-indigo-600">Sala {o.candidato.sala}</span>}
                        {o.candidato.dia_prova && <span className="text-xs text-indigo-600">{new Date(o.candidato.dia_prova + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
                        {o.candidato.horario && <span className="text-xs text-indigo-600">{o.candidato.horario}</span>}
                      </div>
                    </div>
                  )}
                  {/* Descrição */}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{o.descricao}</p>
                </div>
                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => abrirFormEdicao(o)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                    title="Editar"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    onClick={() => deletar(o.id)}
                    disabled={deletando === o.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-40"
                    title="Excluir"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Anexos */}
              {(o.anexos.length > 0 || uploadingFor === o.id) && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {o.anexos.map(a => (
                    <div key={a.id} className="group flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs">
                      {a.mime_type?.startsWith('image/') ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      )}
                      <button
                        onClick={() => ocorrenciasService.abrirAnexo(certameId, o.id, a.id, a.nome_original)}
                        className="text-gray-700 hover:text-indigo-600 truncate max-w-[140px]"
                        title={a.nome_original}
                      >
                        {a.nome_original}
                      </button>
                      {a.tamanho && <span className="text-gray-400">{fmtTamanho(a.tamanho)}</span>}
                      <button
                        onClick={() => deletarAnexo(o.id, a.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-0.5"
                        title="Remover"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                  {uploadingFor === o.id && (
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-400">
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                      Enviando...
                    </div>
                  )}
                </div>
              )}

              {/* Footer com data e botão de anexo */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  {o.registrado_por && <span className="font-medium text-gray-500">{o.registrado_por} · </span>}
                  {o.criado_em && fmtData(o.criado_em)}
                </p>
                <button
                  onClick={() => triggerUpload(o.id)}
                  disabled={uploadingFor === o.id}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  Anexar arquivo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { certamesService } from '../services/certames'
import { periodosService } from '../services/periodos'
import { locaisService } from '../services/locais'
import { arquivosService, type CertameArquivo } from '../services/arquivos'
import { candidatosService, type CandidatoInfo, type LocalAplicacao, type PeriodoLocal, type Candidato, type PeriodoAplicacao, type LocalInfo, type Responsavel } from '../services/candidatos'
import { colaboradoresAdminService, certameEquipeService, type ColaboradorAdmin, type MembroEquipe } from '../services/colaboradores'
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

  useEffect(() => {
    if (!id) return
    certamesService.buscar(id).then(setCertame).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!id || activeTab !== 'Visão geral') return
    setLoadingArquivos(true)
    arquivosService.listar(id).then(setArquivos).finally(() => setLoadingArquivos(false))
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
            </div>
          )
        )}
        {activeTab === 'Períodos' && <TabPeriodos certameId={id!} />}
        {activeTab === 'Locais' && <TabLocaisAplicacao certameId={id!} />}
        {activeTab === 'Candidatos' && <TabCandidatos certameId={id!} />}
        {activeTab === 'Equipes' && <TabEquipes certameId={id!} />}
        {activeTab !== 'Visão geral' && activeTab !== 'Períodos' && activeTab !== 'Locais' && activeTab !== 'Candidatos' && activeTab !== 'Equipes' && (
          <p className="text-gray-400 text-sm">
            Módulo <strong>{activeTab}</strong> em desenvolvimento.
          </p>
        )}
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
    ]).then(([i, l, li, eq, lr]) => { setInfo(i); setLocais(l); setLocaisInfo(li); setEquipe(eq); setLocaisReais(lr) })
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
      const updated = await candidatosService.salvarLocalInfo(certameId, localNome, editResponsaveis, li?.colaboradores_ids ?? [])
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
      const updated = await candidatosService.salvarLocalInfo(certameId, localNome, li?.responsaveis ?? [], editColabIds)
      setLocaisInfo(prev => {
        const idx = prev.findIndex(x => x.local_nome === localNome)
        return idx >= 0 ? prev.map((x, i) => i === idx ? updated : x) : [...prev, updated]
      })
      setEditandoColabs(null)
    } finally {
      setSalvandoColabs(false)
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
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const carregar = () => {
    setLoading(true)
    certameEquipeService.listar(certameId).then(setEquipe).finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [certameId])

  const desvincular = async (membro: MembroEquipe) => {
    if (!window.confirm(`Remover ${membro.nome} da equipe?`)) return
    await certameEquipeService.desvincular(membro.colaborador_id, certameId)
    setEquipe(prev => prev.filter(m => m.id !== membro.id))
  }

  if (loading) return <p className="text-gray-400 text-sm">Carregando...</p>

  return (
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
        <div className="py-8 text-center">
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
              <button
                onClick={() => desvincular(m)}
                className="text-gray-300 hover:text-red-400 transition-colors text-xs shrink-0"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AdicionarMembroModal
          certameId={certameId}
          jaVinculados={equipe.map(m => m.colaborador_id)}
          onClose={() => setShowModal(false)}
          onAdded={() => { carregar(); setShowModal(false) }}
        />
      )}
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
        <p className="text-gray-400 text-sm mb-2">Importe uma planilha com os candidatos do certame</p>
        <p className="text-xs text-gray-300 mb-5">Colunas: INSCRIÇÃO · NOME · CPF · VAGA · DIA DA PROVA · HORÁRIO · LOCAL · SALA · CONDIÇÃO ESPECIAL</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={importando}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {importando ? 'Importando...' : 'Importar planilha'}
        </button>
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
                {c.vaga || ''}
                {c.sala ? ` · ${c.sala}` : ''}
                {c.dia_prova ? ` · ${new Date(c.dia_prova + 'T00:00:00').toLocaleDateString('pt-BR')}` : ''}
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
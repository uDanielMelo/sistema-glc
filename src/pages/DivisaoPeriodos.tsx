import { useEffect, useState, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable, useDraggable } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { certamesService } from '../services/certames'
import { periodosService } from '../services/periodos'
import type { Periodo, Cargo } from '../services/periodos'
import type { Certame } from '../types/index'

export default function DivisaoPeriodos() {
  const [certames, setCertames] = useState<Certame[]>([])
  const [certameSelecionado, setCertameSelecionado] = useState<string>('')
  const [editando, setEditando] = useState<string | null>(null)
  const [periodos, setPeriodos] = useState<Periodo[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [numPeriodos, setNumPeriodos] = useState(2)
  const [loading, setLoading] = useState(false)
  const [activeCargo, setActiveCargo] = useState<Cargo | null>(null)
  const [novoCargoNome, setNovoCargoNome] = useState('')
  const [salvandoCargo, setSalvandoCargo] = useState(false)
  const [certamesComDivisao, setCertamesComDivisao] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    certamesService.listar().then(lista => {
      setCertames(lista)
      // Verifica quais certames já têm períodos
      Promise.all(lista.map(c =>
        periodosService.listarPeriodos(c.id).then(p => p.length > 0 ? c.id : null)
      )).then(ids => setCertamesComDivisao(ids.filter(Boolean) as string[]))
    })
  }, [])

  const abrirCertame = async (id: string) => {
    setEditando(id)
    setLoading(true)
    const [p, c] = await Promise.all([
      periodosService.listarPeriodos(id),
      periodosService.listarCargos(id),
    ])
    setPeriodos(p)
    setCargos(c)
    setLoading(false)
  }

  const voltarLista = () => {
    setEditando(null)
    setPeriodos([])
    setCargos([])
    setCertameSelecionado('')
    // Atualiza lista de certames com divisão
    certamesService.listar().then(lista => {
      Promise.all(lista.map(c =>
        periodosService.listarPeriodos(c.id).then(p => p.length > 0 ? c.id : null)
      )).then(ids => setCertamesComDivisao(ids.filter(Boolean) as string[]))
    })
  }

  const criarPeriodos = async () => {
    if (!certameSelecionado) return
    setLoading(true)
    const novos: Periodo[] = []
    for (let i = 1; i <= numPeriodos; i++) {
      const p = await periodosService.criarPeriodo({
        certame_id: certameSelecionado,
        numero: i,
        label: `Período ${i}`,
      })
      novos.push(p)
    }
    setPeriodos(novos)
    setEditando(certameSelecionado)
    setLoading(false)
  }

  const importarXlsx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editando) return
    setLoading(true)
    try {
      const imported = await periodosService.importarCargos(editando, file)
      setCargos(imported)
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  const adicionarCargoManual = async () => {
    if (!novoCargoNome.trim() || !editando) return
    setSalvandoCargo(true)
    try {
      const cargo = await periodosService.criarCargoManual(editando, novoCargoNome.trim())
      setCargos(prev => [...prev, cargo])
      setNovoCargoNome('')
    } finally {
      setSalvandoCargo(false)
    }
  }

  const handleDragStart = (e: DragStartEvent) => {
    const cargo = cargos.find(c => c.id === e.active.id)
    setActiveCargo(cargo || null)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveCargo(null)
    const { active, over } = e
    if (!over) return
    const cargoId = active.id as string
    const destino = over.id as string
    const novoPeriodoId = destino === 'espera' ? null : destino
    setCargos(prev => prev.map(c => c.id === cargoId ? { ...c, periodo_id: novoPeriodoId } : c))
    await periodosService.atualizarCargo(cargoId, novoPeriodoId)
  }

  const gerarRelatorio = () => {
    const certame = certames.find(c => c.id === editando)
    const html = gerarHTML(certame, periodos, cargos)
    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
  }

  const cargosEspera = cargos.filter(c => !c.periodo_id)
  const certameAtual = certames.find(c => c.id === editando)
  const certamesListados = certames.filter(c => certamesComDivisao.includes(c.id))

  // Tela de edição
  if (editando) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={voltarLista} className="text-sm text-gray-400 hover:text-gray-600">← Voltar</button>
            <h2 className="text-xl font-semibold text-gray-900">{certameAtual?.titulo}</h2>
          </div>
          <div className="flex gap-2">
            {periodos.length > 0 && cargosEspera.length === 0 && (
              <button onClick={gerarRelatorio} className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
                Gerar relatório
              </button>
            )}
            <button onClick={voltarLista} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Salvar e voltar
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex flex-wrap gap-4 items-end">
          {periodos.length === 0 && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Número de períodos</label>
                <input
                  type="number" min={1} max={6} value={numPeriodos}
                  onChange={e => setNumPeriodos(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button onClick={criarPeriodos} disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Criar períodos
              </button>
            </>
          )}
          {periodos.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Importar planilha de cargos</label>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={importarXlsx} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={loading}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                {loading ? 'Importando...' : 'Selecionar arquivo'}
              </button>
            </div>
          )}
        </div>

        {periodos.length > 0 && (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              <div className="flex-shrink-0 w-64">
                <div className="rounded-xl border border-gray-200 bg-gray-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="text-sm font-medium text-gray-900">Aguardando</div>
                    <div className="text-xs text-gray-400">{cargosEspera.length} cargo{cargosEspera.length !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="p-2">
                    <div className="flex gap-1.5 mb-2">
                      <input
                        type="text" value={novoCargoNome}
                        onChange={e => setNovoCargoNome(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && adicionarCargoManual()}
                        placeholder="Nome do cargo..."
                        className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button onClick={adicionarCargoManual} disabled={salvandoCargo || !novoCargoNome.trim()}
                        className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
                        +
                      </button>
                    </div>
                    <DroppableArea id="espera" cargos={cargosEspera} />
                  </div>
                </div>
              </div>
              {periodos.map(p => (
                <ColunaCargos key={p.id} id={p.id}
                  titulo={p.label || `Período ${p.numero}`}
                  cargos={cargos.filter(c => c.periodo_id === p.id)}
                  numero={p.numero}
                />
              ))}
            </div>
            <DragOverlay>
              {activeCargo && <CargoCard cargo={activeCargo} isDragging />}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    )
  }

  // Tela de listagem
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Divisão de Períodos</h2>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Iniciar divisão para um certame</label>
          <select
            value={certameSelecionado}
            onChange={e => setCertameSelecionado(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-64"
          >
            <option value="">Selecione um certame</option>
            {certames.map(c => <option key={c.id} value={c.id}>{c.titulo}</option>)}
          </select>
        </div>
        {certameSelecionado && (
          <button
            onClick={() => abrirCertame(certameSelecionado)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Abrir
          </button>
        )}
      </div>

      {certamesListados.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Divisões em andamento</p>
          <div className="space-y-2">
            {certamesListados.map(c => {
              return (
                <div
                  key={c.id}
                  onClick={() => abrirCertame(c.id)}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
                >
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{c.titulo}</div>
                    {c.orgao && <div className="text-xs text-gray-400 mt-0.5">{c.orgao}</div>}
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">Editar →</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {certamesListados.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-400 text-sm">Nenhuma divisão iniciada ainda.</p>
          <p className="text-gray-300 text-xs mt-1">Selecione um certame acima para começar.</p>
        </div>
      )}
    </div>
  )
}

function DroppableArea({ id, cargos }: { id: string; cargos: Cargo[] }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`min-h-32 space-y-1.5 rounded-lg transition-colors ${isOver ? 'bg-indigo-50' : ''}`}>
      {cargos.map(c => <CargoCard key={c.id} cargo={c} />)}
    </div>
  )
}

function ColunaCargos({ id, titulo, cargos, numero }: { id: string; titulo: string; cargos: Cargo[]; numero?: number }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const total = cargos.reduce((s, c) => s + c.total_inscritos, 0)
  return (
    <div className="flex-shrink-0 w-64">
      <div className={`rounded-xl border ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50'} transition-colors`}>
        <div className={`px-4 py-3 border-b ${isOver ? 'border-indigo-200' : 'border-gray-200'} flex items-center justify-between`}>
          <div>
            <div className="text-sm font-medium text-gray-900">{titulo}</div>
            <div className="text-xs text-gray-400">{cargos.length} cargo{cargos.length !== 1 ? 's' : ''}{total > 0 ? ` · ${total.toLocaleString('pt-BR')} inscritos` : ''}</div>
          </div>
          {numero && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">{numero}º</span>}
        </div>
        <div ref={setNodeRef} className="p-2 min-h-32 space-y-1.5">
          {cargos.map(c => <CargoCard key={c.id} cargo={c} />)}
        </div>
      </div>
    </div>
  )
}

function CargoCard({ cargo, isDragging }: { cargo: Cargo; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: dragging } = useDraggable({ id: cargo.id })
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`bg-white border rounded-lg px-3 py-2 cursor-grab text-xs select-none transition-shadow ${dragging || isDragging ? 'opacity-50 shadow-lg' : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'}`}>
      <div className="font-medium text-gray-800 leading-snug">{cargo.nome}</div>
      {cargo.total_inscritos > 0 && <div className="text-gray-400 mt-0.5">{cargo.total_inscritos.toLocaleString('pt-BR')} inscritos</div>}
    </div>
  )
}

function gerarHTML(certame: Certame | undefined, periodos: Periodo[], cargos: Cargo[]): string {
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const blocos = periodos.map(p => {
    const lista = cargos.filter(c => c.periodo_id === p.id)
    const totalInsc = lista.reduce((s, c) => s + c.total_inscritos, 0)
    const totalDef = lista.reduce((s, c) => s + c.total_deferidos, 0)
    const linhas = lista.map(c => `<tr><td>${c.nome}</td><td class="num">${c.total_inscritos.toLocaleString('pt-BR')}</td><td class="num">${c.total_deferidos.toLocaleString('pt-BR')}</td></tr>`).join('')
    return `<div class="periodo"><div class="periodo-header"><span>${p.label || `Período ${p.numero}`}</span><span class="horario">Horário: _____h_____</span></div><table><thead><tr><th>Cargo</th><th class="num">Inscritos</th><th class="num">Deferidos</th></tr></thead><tbody>${linhas}</tbody></table><div class="periodo-footer"><span>Total</span><span>${totalInsc.toLocaleString('pt-BR')} inscritos · ${totalDef.toLocaleString('pt-BR')} deferidos</span></div></div>`
  }).join('')
  const resumo = periodos.map(p => {
    const lista = cargos.filter(c => c.periodo_id === p.id)
    const totalInsc = lista.reduce((s, c) => s + c.total_inscritos, 0)
    const totalDef = lista.reduce((s, c) => s + c.total_deferidos, 0)
    return `<tr><td>${p.label || `Período ${p.numero}`}</td><td class="num">${totalInsc.toLocaleString('pt-BR')}</td><td class="num">${totalDef.toLocaleString('pt-BR')}</td></tr>`
  }).join('')
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Divisão de Períodos${certame ? ' – ' + certame.titulo : ''}</title><style>* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #111; font-size: 9pt; } .page { width: 210mm; min-height: 297mm; padding: 14mm 16mm; margin: 0 auto; } .header { border-bottom: 2px solid #111; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; } .header-title { font-size: 13pt; font-weight: 700; letter-spacing: -0.3px; } .header-sub { font-size: 8pt; color: #555; margin-top: 2px; } .header-right { text-align: right; font-size: 7.5pt; color: #888; } .resumo { margin-bottom: 12px; } .resumo table { width: 100%; border-collapse: collapse; font-size: 8pt; } .resumo th { text-align: left; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.4px; color: #888; padding: 3px 6px; border-bottom: 1px solid #e5e5e5; } .resumo td { padding: 4px 6px; border-bottom: 1px solid #f0f0f0; } .periodos { display: grid; grid-template-columns: repeat(${periodos.length > 2 ? 3 : periodos.length}, 1fr); gap: 8px; margin-top: 4px; } .periodo { border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; } .periodo-header { background: #f8f8f8; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5e5; } .periodo-header span { font-size: 8.5pt; font-weight: 600; } .horario { font-size: 7pt; color: #aaa; font-weight: 400; } table { width: 100%; border-collapse: collapse; } th { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.3px; color: #888; padding: 4px 8px; text-align: left; border-bottom: 1px solid #f0f0f0; background: #fafafa; } td { padding: 3px 8px; border-bottom: 1px solid #f5f5f5; font-size: 7.5pt; line-height: 1.4; } tr:last-child td { border-bottom: none; } .num { text-align: right; font-variant-numeric: tabular-nums; } .periodo-footer { background: #f8f8f8; border-top: 1px solid #e5e5e5; padding: 5px 8px; display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 600; color: #333; } .footer { margin-top: 12px; border-top: 1px solid #e5e5e5; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7pt; color: #bbb; } @media print { body { background: white; } @page { size: A4; margin: 0; } }</style></head><body><div class="page"><div class="header"><div><div class="header-title">${certame?.titulo || 'Divisão de Períodos'}</div><div class="header-sub">${certame?.orgao || ''}${certame?.numero_edital ? ' · Edital ' + certame.numero_edital : ''}</div></div><div class="header-right">Gerado em ${data}</div></div><div class="resumo"><table><thead><tr><th>Período</th><th class="num">Inscritos</th><th class="num">Deferidos</th></tr></thead><tbody>${resumo}</tbody></table></div><div class="periodos">${blocos}</div><div class="footer"><span>GLC — Gestão e Logística de Certames</span><span>${data}</span></div></div></body></html>`
}
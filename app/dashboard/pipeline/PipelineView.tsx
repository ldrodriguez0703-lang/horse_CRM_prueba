"use client";

import { useState, useCallback, useEffect } from "react";
import { type Proyecto, fmt, PIPELINE_STAGES, PHASES, getPhase } from "@/lib/airtable";

const ENCARGADOS = ["Jesús", "Diego", "Alejandro", "Luis Diego"];

const ENC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Jesús":      { bg: "#F5C20020", text: "#F5C200", border: "#F5C20040" },
  "Diego":      { bg: "#4a9eff20", text: "#4a9eff", border: "#4a9eff40" },
  "Alejandro":  { bg: "#22c55e20", text: "#22c55e", border: "#22c55e40" },
  "Luis Diego": { bg: "#f9731620", text: "#f97316", border: "#f9731640" },
};

function encStyle(name: string) {
  return ENC_COLORS[name] ?? { bg: "#ffffff10", text: "#9b9b9b", border: "#ffffff20" };
}

async function patchPipeline(recordId: string, fields: Record<string, unknown>) {
  await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, fields }),
  });
}

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  aun_no:     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  cancelado:  "bg-[#ff444420] text-[#ff6b6b] border-[#ff444440]",
  finalizado: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

const DEPTO_COLORS: Record<string, string> = {
  "Logística":  "#4a9eff",
  "Casting":    "#f97316",
  "Jingle":     "#a855f7",
  "Arte":       "#22c55e",
  "Crew":       "#F5C200",
  "Equipo":     "#06b6d4",
  "Locación":   "#ec4899",
  "Financiero": "#84cc16",
};

// ── Types ──────────────────────────────────────────────────────────────────
type TareaRodaje = {
  id: string;
  necesidad: string;
  departamento: string;
  resuelto: boolean;
  responsable: string;
  observaciones: string;
};

type Gasto = {
  id: string;
  concepto: string;
  departamento: string;
  presupuesto: string;
  costoReal: string;
  estado: "Pendiente" | "Pagado" | "Parcial";
  notas: string;
};

// ── Tracker Template ────────────────────────────────────────────────────────
const TRACKER_TEMPLATE: Pick<TareaRodaje, "necesidad" | "departamento" | "responsable">[] = [
  { necesidad: "Time Table",                    departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "StoryBoard",                    departamento: "Logística",  responsable: "Alejandro"  },
  { necesidad: "Guión Técnico",                 departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Plan de Rodaje",                departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Llamados",                      departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Contratos",                     departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Firma de Contrato",             departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Firma Cesión de Derechos",      departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Preparar equipo rodaje",        departamento: "Logística",  responsable: "Jesús"      },
  { necesidad: "Alimentación",                  departamento: "Logística",  responsable: "Alejandro"  },
  { necesidad: "Actor Principal",               departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Actor Secundario",              departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 1",                       departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 2",                       departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 3",                       departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Coreógrafo",                    departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Producción del Jingle",         departamento: "Jingle",     responsable: "Diego"      },
  { necesidad: "Cantante",                      departamento: "Jingle",     responsable: "Diego"      },
  { necesidad: "Directora de Arte",             departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Moodboard de Arte",             departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Insumos de Arte",               departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Props",                         departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Conformación de Crew",          departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Director",                      departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Director de Foto",              departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Asistente 1",                   departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Asistente 2",                   departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Productor",                     departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Maquillista",                   departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Alquiler de Grúa",              departamento: "Equipo",     responsable: "Jesús"      },
  { necesidad: "Alquiler de Lentes",            departamento: "Equipo",     responsable: "Jesús"      },
  { necesidad: "Locación Principal",            departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Locación Secundaria",           departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Permisos de Locación",          departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Definición Fechas de Pago",     departamento: "Financiero", responsable: "Luis Diego" },
  { necesidad: "Facturar",                      departamento: "Financiero", responsable: "Luis Diego" },
  { necesidad: "Documento de pagos",            departamento: "Financiero", responsable: "Luis Diego" },
];

function makeTracker(): TareaRodaje[] {
  return TRACKER_TEMPLATE.map((t, i) => ({
    id: `tpl_${i}`,
    necesidad: t.necesidad,
    departamento: t.departamento,
    resuelto: false,
    responsable: t.responsable,
    observaciones: "",
  }));
}

// ── PhaseBar ────────────────────────────────────────────────────────────────
function PhaseBar({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="w-full">
      <div className="mb-1" style={{ display: "grid", gridTemplateColumns: `repeat(${PHASES.length}, 1fr)` }}>
        {PHASES.map((p) => {
          const active  = porcentaje >= p.min;
          const current = porcentaje >= p.min && porcentaje <= p.max;
          return (
            <p key={p.label} className={`text-[10px] font-medium text-center truncate px-0.5 ${
              current ? "text-[#FAFAFA]" : active ? "text-[#6b6b6b]" : "text-[#3a3a3a]"
            }`}>{p.label}</p>
          );
        })}
      </div>
      <div className="flex gap-0.5 h-2.5">
        {PHASES.map((p) => {
          const filled  = porcentaje > p.max;
          const current = porcentaje >= p.min && porcentaje <= p.max;
          const range = p.max - p.min;
          const w = current ? (range === 0 ? 100 : Math.round(((porcentaje - p.min) / range) * 100)) : 0;
          return (
            <div key={p.label} className="flex-1 bg-[#2a2a2a] rounded-sm overflow-hidden relative">
              {filled  && <div className="absolute inset-0" style={{ background: p.color, opacity: 0.7 }} />}
              {current && <div className="absolute inset-y-0 left-0 transition-all duration-500 rounded-sm" style={{ width: `${w}%`, background: p.color }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function etapaFromPct(pct: number) {
  const sorted = [...PIPELINE_STAGES].sort((a, b) => b.pct - a.pct);
  return sorted.find((s) => pct >= s.pct) ?? PIPELINE_STAGES[0];
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function PipelineView({ proyectos }: { proyectos: Proyecto[] }) {
  const [selected,        setSelected]        = useState<Proyecto | null>(null);
  const [detailTab,       setDetailTab]       = useState<"general" | "produccion" | "gastos">("general");
  const [tareas,          setTareas]          = useState("");
  const [encargado,       setEncargado]       = useState("");
  const [etapaKey,        setEtapaKey]        = useState<string>("");
  const [filterFase,      setFilterFase]      = useState("Todas");
  const [filterEncargado, setFilterEncargado] = useState("Todos");
  const [search,          setSearch]          = useState("");
  const [pctOverrides,    setPctOverrides]    = useState<Record<string, number>>({});
  const [encargadoMap,    setEncargadoMap]    = useState<Record<string, string>>({});
  const [etapaMap,        setEtapaMap]        = useState<Record<string, string>>({});
  const [tracker,         setTracker]         = useState<TareaRodaje[]>([]);
  const [gastos,          setGastos]          = useState<Gasto[]>([]);
  const [showGastoForm,   setShowGastoForm]   = useState(false);
  const [newGasto,        setNewGasto]        = useState<Omit<Gasto, "id">>({
    concepto: "", departamento: "", presupuesto: "", costoReal: "", estado: "Pendiente", notas: "",
  });

  useEffect(() => {
    const encMap: Record<string, string> = {};
    const etMap:  Record<string, string> = {};
    proyectos.forEach((p) => {
      encMap[p.id] = localStorage.getItem(`encargado_${p.id}`) ?? p.encargado ?? "";
      const saved = localStorage.getItem(`etapa_${p.id}`);
      if (saved) etMap[p.id] = saved;
    });
    setEncargadoMap(encMap);
    setEtapaMap(etMap);
  }, [proyectos]);

  function effectivePct(p: Proyecto) {
    return pctOverrides[p.id] ?? p.porcentaje;
  }

  const activos = proyectos.filter(
    (p) => p.estadoNorm !== "cancelado" && p.estadoNorm !== "aun_no" && p.estadoNorm !== "finalizado"
  );

  const filtered = activos.filter((p) => {
    const fase    = getPhase(effectivePct(p)).label;
    const cardEnc = encargadoMap[p.id] || p.encargado || "";
    return (
      (filterFase === "Todas" || fase === filterFase) &&
      (filterEncargado === "Todos" || cardEnc === filterEncargado) &&
      (p.cliente.toLowerCase().includes(search.toLowerCase()) ||
       p.proyecto.toLowerCase().includes(search.toLowerCase()) ||
       p.representante.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const byPhase = PHASES.map((ph) => ({
    ...ph,
    count: activos.filter((p) => getPhase(effectivePct(p)).label === ph.label).length,
  }));

  function openDetail(p: Proyecto) {
    const pct      = effectivePct(p);
    const savedKey = localStorage.getItem(`etapa_${p.id}`);
    const key      = savedKey ?? (() => { const s = etapaFromPct(pct); return `${s.fase}|${s.etapa}`; })();
    setSelected(p);
    setDetailTab("general");
    setEtapaKey(key);
    setEtapaMap((m) => ({ ...m, [p.id]: key }));
    setTareas(localStorage.getItem(`tasks_${p.id}`) ?? "");
    const savedEnc = localStorage.getItem(`encargado_${p.id}`) ?? (p.encargado || "");
    setEncargado(savedEnc);
    if (savedEnc) setEncargadoMap((m) => ({ ...m, [p.id]: savedEnc }));
    const savedTracker = localStorage.getItem(`tracker_${p.id}`);
    setTracker(savedTracker ? JSON.parse(savedTracker) : makeTracker());
    const savedGastos = localStorage.getItem(`gastos_${p.id}`);
    setGastos(savedGastos ? JSON.parse(savedGastos) : []);
    setShowGastoForm(false);
    setNewGasto({ concepto: "", departamento: "", presupuesto: "", costoReal: "", estado: "Pendiente", notas: "" });
  }

  function handleEtapaChange(key: string) {
    setEtapaKey(key);
    if (!selected) return;
    const [fase, etapa] = key.split("|");
    const stage = PIPELINE_STAGES.find((s) => s.fase === fase && s.etapa === etapa);
    if (!stage) return;
    setPctOverrides((o) => ({ ...o, [selected.id]: stage.pct }));
    setEtapaMap((m) => ({ ...m, [selected.id]: key }));
    setSelected((s) => s ? { ...s, porcentaje: stage.pct } : s);
    localStorage.setItem(`etapa_${selected.id}`, key);
    patchPipeline(selected.id, { Porcentaje: stage.pct });
  }

  function handleEncargadoChange(value: string) {
    setEncargado(value);
    if (!selected) return;
    setEncargadoMap((m) => ({ ...m, [selected.id]: value }));
    localStorage.setItem(`encargado_${selected.id}`, value);
    if (value) patchPipeline(selected.id, { Encargado: value });
  }

  const saveTareas = useCallback((id: string, text: string) => {
    localStorage.setItem(`tasks_${id}`, text);
    patchPipeline(id, { "Tareas pendientes": text });
  }, []);

  function toggleTarea(id: string) {
    if (!selected) return;
    const updated = tracker.map((t) => t.id === id ? { ...t, resuelto: !t.resuelto } : t);
    setTracker(updated);
    localStorage.setItem(`tracker_${selected.id}`, JSON.stringify(updated));
  }

  function addGasto() {
    if (!selected || !newGasto.concepto) return;
    const updated = [...gastos, { ...newGasto, id: `g${Date.now()}` }];
    setGastos(updated);
    localStorage.setItem(`gastos_${selected.id}`, JSON.stringify(updated));
    setNewGasto({ concepto: "", departamento: "", presupuesto: "", costoReal: "", estado: "Pendiente", notas: "" });
    setShowGastoForm(false);
  }

  function deleteGasto(id: string) {
    if (!selected) return;
    const updated = gastos.filter((g) => g.id !== id);
    setGastos(updated);
    localStorage.setItem(`gastos_${selected.id}`, JSON.stringify(updated));
  }

  const fases = PHASES.map((ph) => ({
    fase: ph.label,
    color: ph.color,
    etapas: PIPELINE_STAGES.filter((s) => s.fase === ph.label),
  }));

  const trackerByDepto = tracker.reduce<Record<string, TareaRodaje[]>>((acc, t) => {
    if (!acc[t.departamento]) acc[t.departamento] = [];
    acc[t.departamento].push(t);
    return acc;
  }, {});

  const totalResueltas   = tracker.filter((t) => t.resuelto).length;
  const trackerPct       = tracker.length > 0 ? Math.round((totalResueltas / tracker.length) * 100) : 0;
  const totalPresupuesto = gastos.reduce((s, g) => s + (parseFloat(g.presupuesto) || 0), 0);
  const totalReal        = gastos.reduce((s, g) => s + (parseFloat(g.costoReal)   || 0), 0);

  return (
    <div className="flex gap-5 h-full">
      {/* ── Left panel ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${byPhase.length}, 1fr)` }}>
          {byPhase.map((ph) => (
            <button key={ph.label}
              onClick={() => setFilterFase(filterFase === ph.label ? "Todas" : ph.label)}
              className={`rounded-xl p-3.5 border text-left transition-all ${
                filterFase === ph.label ? "border-[#F5C200] bg-[#F5C20010]" : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ph.color }} />
                <p className="text-xs text-[#6b6b6b] truncate">{ph.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#FAFAFA]">{ph.count}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterEncargado("Todos")}
            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              filterEncargado === "Todos"
                ? "bg-[#FAFAFA] text-[#0a0a0a] border-[#FAFAFA]"
                : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#FAFAFA]"
            }`}>Todos</button>
          {ENCARGADOS.map((e) => {
            const s = encStyle(e); const active = filterEncargado === e;
            return (
              <button key={e} onClick={() => setFilterEncargado(active ? "Todos" : e)}
                className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                style={active ? { background: s.text, borderColor: s.text, color: "#0a0a0a" }
                              : { background: s.bg,   borderColor: s.border, color: s.text }}>
                {e}
              </button>
            );
          })}
        </div>

        <input type="text" placeholder="Buscar cliente, proyecto o representante..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
        />

        <div className="space-y-3 overflow-y-auto">
          {[...filtered].sort((a, b) => effectivePct(b) - effectivePct(a)).map((p) => {
            const pct      = effectivePct(p);
            const fase     = getPhase(pct);
            const savedKey = etapaMap[p.id];
            const etapa    = savedKey
              ? (PIPELINE_STAGES.find((s) => `${s.fase}|${s.etapa}` === savedKey) ?? etapaFromPct(pct))
              : etapaFromPct(pct);
            const cardEnc = encargadoMap[p.id] || p.encargado;
            const enc     = cardEnc ? encStyle(cardEnc) : null;
            const parts   = [p.proyecto, p.cliente, p.totalAcordado > 0 ? fmt(p.totalAcordado) : null].filter(Boolean);
            return (
              <div key={p.id} onClick={() => openDetail(p)}
                className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] ${
                  selected?.id === p.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
                }`}>
                <p className="text-[#FAFAFA] font-bold text-base leading-tight mb-1 truncate">{parts.join(" — ")}</p>
                {(p.representante || p.fechaEntrega) && (
                  <p className="text-[#6b6b6b] text-xs mb-2">
                    {p.representante}{p.fechaEntrega && <> · <span className="text-[#F5C200]">{p.fechaEntrega}</span></>}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                    style={{ background: `${fase.color}15`, color: fase.color, borderColor: `${fase.color}40` }}>
                    {etapa.etapa}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_STYLE[p.estadoNorm]}`}>
                    {p.estado}
                  </span>
                  {enc && cardEnc && (
                    <span className="text-xs px-2 py-0.5 rounded-full border font-medium"
                      style={{ background: enc.bg, color: enc.text, borderColor: enc.border }}>
                      {cardEnc}
                    </span>
                  )}
                  <span className="ml-auto text-sm font-bold text-[#FAFAFA]">{pct}%</span>
                </div>
                <PhaseBar porcentaje={pct} />
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-[#6b6b6b] text-sm pt-2">Sin proyectos.</p>}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-[480px] flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">

          {/* Panel header */}
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[#FAFAFA] font-bold truncate">{selected.cliente}</p>
                {selected.proyecto && <p className="text-[#6b6b6b] text-xs mt-0.5 truncate">{selected.proyecto}</p>}
                <p className="text-[#6b6b6b] text-xs">{selected.representante} · {selected.fechaEntrega || "Sin fecha"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl flex-shrink-0">×</button>
            </div>
            <div className="mt-3"><PhaseBar porcentaje={effectivePct(selected)} /></div>
            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {(["general", "produccion", "gastos"] as const).map((tab) => (
                <button key={tab} onClick={() => setDetailTab(tab)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    detailTab === tab
                      ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                      : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
                  }`}>
                  {tab === "general" ? "General" : tab === "produccion" ? "Producción" : "Gastos"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── GENERAL ── */}
            {detailTab === "general" && (
              <div className="p-5 space-y-5">
                <div>
                  <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Encargado</p>
                  <div className="flex gap-2 flex-wrap mb-1">
                    {ENCARGADOS.map((e) => {
                      const s = encStyle(e); const active = encargado === e;
                      return (
                        <button key={e} onClick={() => handleEncargadoChange(active ? "" : e)}
                          className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                          style={active ? { background: s.text, borderColor: s.text, color: "#0a0a0a" }
                                        : { background: s.bg,   borderColor: s.border, color: s.text }}>
                          {e}
                        </button>
                      );
                    })}
                  </div>
                  {etapaKey && !encargado && (
                    <p className="text-xs text-[#F5C200]">Asigna un encargado para esta etapa</p>
                  )}
                </div>

                <div>
                  <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Etapa del proyecto</p>
                  <div className="space-y-1.5">
                    {fases.map((f) => (
                      <div key={f.fase}>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: f.color }}>{f.fase}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {f.etapas.map((s) => {
                            const key = `${s.fase}|${s.etapa}`; const active = etapaKey === key;
                            return (
                              <button key={key} onClick={() => handleEtapaChange(key)}
                                className={`text-left px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                  active ? "text-[#0a0a0a] font-semibold border-transparent"
                                         : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
                                }`}
                                style={active ? { background: f.color, borderColor: f.color } : {}}>
                                {s.etapa}
                                <span className={`ml-1 text-[10px] ${active ? "opacity-70" : "text-[#3a3a3a]"}`}>{s.pct}%</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Tareas pendientes</p>
                  <textarea
                    value={tareas}
                    onChange={(e) => { setTareas(e.target.value); saveTareas(selected.id, e.target.value); }}
                    placeholder={"- Confirmar locación\n- Enviar call sheet\n- Revisar guion v3\n- Entregar corte offline..."}
                    rows={6}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200] resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-[#3a3a3a] mt-1">Auto-guardado</p>
                </div>

                {selected.descripcion && (
                  <div>
                    <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Descripción</p>
                    <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-28 overflow-y-auto">
                      {selected.descripcion}
                    </p>
                  </div>
                )}

                {(selected.proforma || selected.presentacion) && (
                  <div>
                    <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Documentos</p>
                    <div className="space-y-1.5">
                      {selected.proforma     && <a href={selected.proforma}     target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">↗ Proforma</a>}
                      {selected.presentacion && <a href={selected.presentacion} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">↗ Presentación</a>}
                    </div>
                  </div>
                )}

                {selected.material.length > 0 && (
                  <div>
                    <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Material ({selected.material.length})</p>
                    <div className="grid grid-cols-3 gap-2">
                      {selected.material.map((att) => (
                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                          className="aspect-square bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#F5C200] transition-colors">
                          {att.type.startsWith("image/") && att.thumbnails?.small
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={att.thumbnails.small.url} alt={att.filename} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center p-1"><span className="text-[9px] text-[#6b6b6b] text-center line-clamp-2">{att.filename}</span></div>
                          }
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PRODUCCIÓN ── */}
            {detailTab === "produccion" && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase">Avance del rodaje</p>
                  <span className="text-[#F5C200] font-bold text-sm">{trackerPct}% ({totalResueltas}/{tracker.length})</span>
                </div>
                <div className="h-1.5 bg-[#2a2a2a] rounded-full mb-5 overflow-hidden">
                  <div className="h-full bg-[#F5C200] rounded-full transition-all duration-500" style={{ width: `${trackerPct}%` }} />
                </div>

                <div className="space-y-4">
                  {Object.entries(trackerByDepto).map(([depto, items]) => {
                    const resueltas = items.filter((t) => t.resuelto).length;
                    const color     = DEPTO_COLORS[depto] ?? "#9b9b9b";
                    return (
                      <div key={depto}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>{depto}</p>
                          <span className="text-[10px]" style={{ color: resueltas === items.length ? color : "#6b6b6b" }}>
                            {resueltas}/{items.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {items.map((t) => {
                            const enc = encStyle(t.responsable);
                            return (
                              <div key={t.id} onClick={() => toggleTarea(t.id)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all group ${
                                  t.resuelto ? "bg-[#1a1a1a] border-[#2a2a2a] opacity-50" : "bg-[#111111] border-[#2a2a2a] hover:border-[#3a3a3a]"
                                }`}>
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                                  t.resuelto ? "border-transparent" : "border-[#3a3a3a] group-hover:border-[#6b6b6b]"
                                }`} style={t.resuelto ? { background: color, borderColor: color } : {}}>
                                  {t.resuelto && <span className="text-[#0a0a0a] text-[10px] font-bold">✓</span>}
                                </div>
                                <p className={`flex-1 text-xs min-w-0 truncate ${t.resuelto ? "line-through text-[#3a3a3a]" : "text-[#FAFAFA]"}`}>
                                  {t.necesidad}
                                </p>
                                <span className="text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0"
                                  style={{ background: enc.bg, color: enc.text, borderColor: enc.border }}>
                                  {t.responsable.split(" ")[0]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── GASTOS ── */}
            {detailTab === "gastos" && (
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: "Presupuesto", value: `$${totalPresupuesto.toLocaleString()}`, color: "#FAFAFA" },
                    { label: "Real",        value: `$${totalReal.toLocaleString()}`,        color: totalReal > totalPresupuesto ? "#ff6b6b" : "#22c55e" },
                    { label: "Diferencia",  value: `${totalReal > totalPresupuesto ? "-" : "+"}$${Math.abs(totalPresupuesto - totalReal).toLocaleString()}`, color: totalReal > totalPresupuesto ? "#ff6b6b" : "#22c55e" },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-4">
                  {gastos.length === 0 && !showGastoForm && (
                    <p className="text-[#6b6b6b] text-xs py-4 text-center">Sin gastos registrados.</p>
                  )}
                  {gastos.map((g) => (
                    <div key={g.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[#FAFAFA] text-xs font-medium truncate">{g.concepto}</p>
                          {g.departamento && <p className="text-[#6b6b6b] text-[10px]">{g.departamento}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                            g.estado === "Pagado"  ? "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]" :
                            g.estado === "Parcial" ? "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]" :
                                                     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]"
                          }`}>{g.estado}</span>
                          <button onClick={() => deleteGasto(g.id)} className="text-[#3a3a3a] hover:text-[#ff6b6b] text-sm transition-colors">×</button>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2">
                        <p className="text-[10px] text-[#6b6b6b]">Ppto: <span className="text-[#FAFAFA]">${parseFloat(g.presupuesto || "0").toLocaleString()}</span></p>
                        <p className="text-[10px] text-[#6b6b6b]">Real: <span style={{ color: parseFloat(g.costoReal || "0") > parseFloat(g.presupuesto || "0") ? "#ff6b6b" : "#22c55e" }}>
                          ${parseFloat(g.costoReal || "0").toLocaleString()}
                        </span></p>
                      </div>
                      {g.notas && <p className="text-[10px] text-[#6b6b6b] mt-1 truncate">{g.notas}</p>}
                    </div>
                  ))}
                </div>

                {showGastoForm ? (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 space-y-2">
                    <input type="text" placeholder="Concepto *" value={newGasto.concepto}
                      onChange={(e) => setNewGasto((g) => ({ ...g, concepto: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    <input type="text" placeholder="Departamento" value={newGasto.departamento}
                      onChange={(e) => setNewGasto((g) => ({ ...g, departamento: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="Presupuesto" value={newGasto.presupuesto}
                        onChange={(e) => setNewGasto((g) => ({ ...g, presupuesto: e.target.value }))}
                        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                      <input type="number" placeholder="Costo Real" value={newGasto.costoReal}
                        onChange={(e) => setNewGasto((g) => ({ ...g, costoReal: e.target.value }))}
                        className="bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    </div>
                    <select value={newGasto.estado}
                      onChange={(e) => setNewGasto((g) => ({ ...g, estado: e.target.value as Gasto["estado"] }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#F5C200]">
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pagado">Pagado</option>
                      <option value="Parcial">Parcial</option>
                    </select>
                    <input type="text" placeholder="Notas" value={newGasto.notas}
                      onChange={(e) => setNewGasto((g) => ({ ...g, notas: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={addGasto}
                        className="flex-1 bg-[#F5C200] text-[#0a0a0a] text-xs font-semibold py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                        Agregar
                      </button>
                      <button onClick={() => setShowGastoForm(false)}
                        className="px-3 bg-[#2a2a2a] text-[#6b6b6b] text-xs py-1.5 rounded-lg hover:text-[#FAFAFA] transition-colors">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowGastoForm(true)}
                    className="w-full border border-dashed border-[#2a2a2a] rounded-lg py-2.5 text-xs text-[#6b6b6b] hover:border-[#F5C200] hover:text-[#F5C200] transition-all">
                    + Agregar gasto
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

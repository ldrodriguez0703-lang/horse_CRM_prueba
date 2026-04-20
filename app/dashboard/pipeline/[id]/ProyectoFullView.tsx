"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { type Proyecto, fmt, PIPELINE_STAGES, PHASES, getPhase } from "@/lib/airtable";

// ── Constants ────────────────────────────────────────────────────────────────
const ENCARGADOS = ["Jesús", "Diego", "Alejandro", "Luis Diego", "CLIENTE", "Todos"];

const ENC_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Jesús":      { bg: "#F5C20020", text: "#F5C200",  border: "#F5C20040" },
  "Diego":      { bg: "#4a9eff20", text: "#4a9eff",  border: "#4a9eff40" },
  "Alejandro":  { bg: "#22c55e20", text: "#22c55e",  border: "#22c55e40" },
  "Luis Diego": { bg: "#f9731620", text: "#f97316",  border: "#f9731640" },
  "CLIENTE":    { bg: "#a855f720", text: "#a855f7",  border: "#a855f740" },
  "Todos":      { bg: "#06b6d420", text: "#06b6d4",  border: "#06b6d440" },
};
function encStyle(n: string) { return ENC_COLORS[n] ?? { bg: "#ffffff10", text: "#9b9b9b", border: "#ffffff20" }; }

const DEPTO_COLORS: Record<string, string> = {
  "Logística": "#4a9eff", "Casting": "#f97316", "Jingle": "#a855f7",
  "Arte": "#22c55e", "Crew": "#F5C200", "Equipo": "#06b6d4",
  "Locación": "#ec4899", "Financiero": "#84cc16",
};

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  aun_no:     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  cancelado:  "bg-[#ff444420] text-[#ff6b6b] border-[#ff444440]",
  finalizado: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

async function patchPipeline(recordId: string, fields: Record<string, unknown>) {
  await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, fields }),
  });
}

// ── Types ────────────────────────────────────────────────────────────────────
type TareaRodaje = {
  id: string; necesidad: string; departamento: string;
  resuelto: boolean; responsable: string; observaciones: string;
};
type Gasto = {
  id: string; concepto: string; departamento: string;
  presupuesto: string; costoReal: string;
  estado: "Pendiente" | "Pagado" | "Parcial"; notas: string;
};
type EscenaGuion = {
  id: string; numero: number; titulo: string;
  personajes: string; descripcion: string; dialogo: string; notas: string;
};
type PlanoTecnico = {
  id: string; idPlano: string; escena: string; extInt: string;
  locacion: string; valorPlano: string; descripcion: string;
  personajes: string; movimiento: string; props: string;
};
type TareaTimeline = {
  id: string; wbs: string; tarea: string; responsable: string;
  inicia: string; termina: string; porcentaje: number; fase: string;
};

// ── Templates ────────────────────────────────────────────────────────────────
const TRACKER_TEMPLATE: Pick<TareaRodaje, "necesidad" | "departamento" | "responsable">[] = [
  { necesidad: "Time Table",               departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "StoryBoard",               departamento: "Logística",  responsable: "Alejandro"  },
  { necesidad: "Guión Técnico",            departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Plan de Rodaje",           departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Llamados",                 departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Contratos",               departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Firma de Contrato",        departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Firma Cesión de Derechos", departamento: "Logística",  responsable: "Luis Diego" },
  { necesidad: "Preparar equipo rodaje",   departamento: "Logística",  responsable: "Jesús"      },
  { necesidad: "Alimentación",             departamento: "Logística",  responsable: "Alejandro"  },
  { necesidad: "Actor Principal",          departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Actor Secundario",         departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 1",                  departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 2",                  departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Extra 3",                  departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Coreógrafo",              departamento: "Casting",    responsable: "Diego"      },
  { necesidad: "Producción del Jingle",   departamento: "Jingle",     responsable: "Diego"      },
  { necesidad: "Cantante",                 departamento: "Jingle",     responsable: "Diego"      },
  { necesidad: "Directora de Arte",        departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Moodboard de Arte",        departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Insumos de Arte",          departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Props",                    departamento: "Arte",       responsable: "Alejandro"  },
  { necesidad: "Conformación de Crew",    departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Director",                 departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Director de Foto",         departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Asistente 1",              departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Asistente 2",              departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Productor",                departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Maquillista",              departamento: "Crew",       responsable: "Diego"      },
  { necesidad: "Alquiler de Grúa",        departamento: "Equipo",     responsable: "Jesús"      },
  { necesidad: "Alquiler de Lentes",       departamento: "Equipo",     responsable: "Jesús"      },
  { necesidad: "Locación Principal",      departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Locación Secundaria",     departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Permisos de Locación",    departamento: "Locación",   responsable: "Jesús"      },
  { necesidad: "Definición Fechas Pago",   departamento: "Financiero", responsable: "Luis Diego" },
  { necesidad: "Facturar",                 departamento: "Financiero", responsable: "Luis Diego" },
  { necesidad: "Documento de pagos",       departamento: "Financiero", responsable: "Luis Diego" },
];

const TIMELINE_TEMPLATE: Omit<TareaTimeline, "id">[] = [
  { wbs: "1.1",  tarea: "Contratos",              responsable: "Luis Diego", inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.2",  tarea: "Firma de Contrato",       responsable: "Luis Diego", inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.3",  tarea: "Time Table",              responsable: "Alejandro",  inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.4",  tarea: "Guión",                  responsable: "Diego",      inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.5",  tarea: "Aprobación de Guión",    responsable: "CLIENTE",    inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.6",  tarea: "StoryBoard",              responsable: "Alejandro",  inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.7",  tarea: "Aprobación StoryBoard",   responsable: "CLIENTE",    inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.8",  tarea: "Locaciones",              responsable: "Jesús",      inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.9",  tarea: "Aprobación Locaciones",   responsable: "CLIENTE",    inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.10", tarea: "Casting",                 responsable: "Diego",      inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.11", tarea: "Aprobación Casting",      responsable: "CLIENTE",    inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.12", tarea: "Dirección de Arte",       responsable: "Alejandro",  inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.13", tarea: "Plan de Rodaje",          responsable: "Luis Diego", inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.14", tarea: "Llamados",                responsable: "Luis Diego", inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "1.15", tarea: "Alimentación",            responsable: "Alejandro",  inicia: "", termina: "", porcentaje: 0, fase: "Pre-Producción" },
  { wbs: "2.1",  tarea: "Producción Jingle",       responsable: "Todos",      inicia: "", termina: "", porcentaje: 0, fase: "Producción"     },
  { wbs: "2.2",  tarea: "Rodaje Día 1",            responsable: "Todos",      inicia: "", termina: "", porcentaje: 0, fase: "Producción"     },
  { wbs: "2.3",  tarea: "Rodaje Día 2",            responsable: "Todos",      inicia: "", termina: "", porcentaje: 0, fase: "Producción"     },
  { wbs: "3.1",  tarea: "Edición",                 responsable: "Luis Diego", inicia: "", termina: "", porcentaje: 0, fase: "Post-Producción"},
  { wbs: "3.2",  tarea: "Animación 2D",            responsable: "Alejandro",  inicia: "", termina: "", porcentaje: 0, fase: "Post-Producción"},
  { wbs: "4.1",  tarea: "Primera Entrega",         responsable: "Diego",      inicia: "", termina: "", porcentaje: 0, fase: "Entregas"       },
  { wbs: "4.2",  tarea: "Revisión Cliente",        responsable: "CLIENTE",    inicia: "", termina: "", porcentaje: 0, fase: "Entregas"       },
  { wbs: "4.3",  tarea: "Entrega Final",           responsable: "Diego",      inicia: "", termina: "", porcentaje: 0, fase: "Entregas"       },
];

const FASE_COLORS: Record<string, string> = {
  "Pre-Producción": "#4a9eff", "Producción": "#f97316",
  "Post-Producción": "#a855f7", "Entregas": "#22c55e",
};

function makeTracker(): TareaRodaje[] {
  return TRACKER_TEMPLATE.map((t, i) => ({
    id: `tpl_${i}`, necesidad: t.necesidad, departamento: t.departamento,
    resuelto: false, responsable: t.responsable, observaciones: "",
  }));
}
function makeTimeline(): TareaTimeline[] {
  return TIMELINE_TEMPLATE.map((t, i) => ({ ...t, id: `tt_${i}` }));
}

// ── PhaseBar ─────────────────────────────────────────────────────────────────
function PhaseBar({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="w-full">
      <div className="mb-1" style={{ display: "grid", gridTemplateColumns: `repeat(${PHASES.length}, 1fr)` }}>
        {PHASES.map((p) => {
          const active = porcentaje >= p.min; const current = porcentaje >= p.min && porcentaje <= p.max;
          return <p key={p.label} className={`text-[10px] font-medium text-center truncate px-0.5 ${current ? "text-[#FAFAFA]" : active ? "text-[#6b6b6b]" : "text-[#3a3a3a]"}`}>{p.label}</p>;
        })}
      </div>
      <div className="flex gap-0.5 h-2.5">
        {PHASES.map((p) => {
          const filled = porcentaje > p.max; const current = porcentaje >= p.min && porcentaje <= p.max;
          const w = current ? (p.max - p.min === 0 ? 100 : Math.round(((porcentaje - p.min) / (p.max - p.min)) * 100)) : 0;
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
  return [...PIPELINE_STAGES].sort((a, b) => b.pct - a.pct).find((s) => pct >= s.pct) ?? PIPELINE_STAGES[0];
}

// ── Input helpers ─────────────────────────────────────────────────────────────
const inputCls = "bg-transparent border-b border-transparent hover:border-[#3a3a3a] focus:border-[#F5C200] text-[#FAFAFA] focus:outline-none transition-colors w-full";
const cellCls  = "px-2 py-1.5 text-xs";

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProyectoFullView({ proyecto }: { proyecto: Proyecto }) {
  const router = useRouter();
  type Tab = "general" | "produccion" | "guion" | "guion-tecnico" | "timetable" | "gastos";
  const [tab,       setTab]       = useState<Tab>("general");
  const [etapaKey,  setEtapaKey]  = useState("");
  const [encargado, setEncargado] = useState(proyecto.encargado ?? "");
  const [tareas,    setTareas]    = useState("");
  const [pct,       setPct]       = useState(proyecto.porcentaje);

  // Producción
  const [tracker, setTracker] = useState<TareaRodaje[]>([]);
  // Guión
  const [guion,   setGuion]   = useState<EscenaGuion[]>([]);
  // Guión Técnico
  const [planos,  setPlanos]  = useState<PlanoTecnico[]>([]);
  // Time Table
  const [timeline, setTimeline] = useState<TareaTimeline[]>([]);
  // Gastos
  const [gastos,       setGastos]       = useState<Gasto[]>([]);
  const [showGastoForm, setShowGastoForm] = useState(false);
  const [newGasto,      setNewGasto]     = useState<Omit<Gasto, "id">>({
    concepto: "", departamento: "", presupuesto: "", costoReal: "", estado: "Pendiente", notas: "",
  });

  useEffect(() => {
    const id = proyecto.id;
    const savedEtapa = localStorage.getItem(`etapa_${id}`);
    setEtapaKey(savedEtapa ?? (() => { const s = etapaFromPct(proyecto.porcentaje); return `${s.fase}|${s.etapa}`; })());
    setTareas(localStorage.getItem(`tasks_${id}`) ?? "");
    const savedEnc = localStorage.getItem(`encargado_${id}`); if (savedEnc) setEncargado(savedEnc);
    const savedTracker = localStorage.getItem(`tracker_${id}`);
    setTracker(savedTracker ? JSON.parse(savedTracker) : makeTracker());
    const savedGuion = localStorage.getItem(`guion_${id}`);
    setGuion(savedGuion ? JSON.parse(savedGuion) : []);
    const savedPlanos = localStorage.getItem(`planos_${id}`);
    setPlanos(savedPlanos ? JSON.parse(savedPlanos) : []);
    const savedTimeline = localStorage.getItem(`timeline_${id}`);
    setTimeline(savedTimeline ? JSON.parse(savedTimeline) : makeTimeline());
    const savedGastos = localStorage.getItem(`gastos_${id}`);
    setGastos(savedGastos ? JSON.parse(savedGastos) : []);
  }, [proyecto.id, proyecto.porcentaje, proyecto.encargado]);

  const id = proyecto.id;

  // ── Handlers ──
  function handleEtapaChange(key: string) {
    setEtapaKey(key);
    const [fase, etapa] = key.split("|");
    const stage = PIPELINE_STAGES.find((s) => s.fase === fase && s.etapa === etapa);
    if (!stage) return;
    setPct(stage.pct);
    localStorage.setItem(`etapa_${id}`, key);
    patchPipeline(id, { Porcentaje: stage.pct });
  }

  function handleEncargadoChange(v: string) {
    setEncargado(v);
    localStorage.setItem(`encargado_${id}`, v);
    if (v) patchPipeline(id, { Encargado: v });
  }

  function saveT(text: string) {
    setTareas(text);
    localStorage.setItem(`tasks_${id}`, text);
    patchPipeline(id, { "Tareas pendientes": text });
  }

  // Tracker
  function saveTracker(updated: TareaRodaje[]) { setTracker(updated); localStorage.setItem(`tracker_${id}`, JSON.stringify(updated)); }
  function toggleTarea(tid: string) { saveTracker(tracker.map((t) => t.id === tid ? { ...t, resuelto: !t.resuelto } : t)); }
  function updateTarea(tid: string, field: keyof TareaRodaje, value: string) {
    saveTracker(tracker.map((t) => t.id === tid ? { ...t, [field]: value } : t));
  }
  function addTarea(depto: string) {
    const t: TareaRodaje = { id: `t${Date.now()}`, necesidad: "Nueva tarea", departamento: depto, resuelto: false, responsable: "Diego", observaciones: "" };
    saveTracker([...tracker, t]);
  }
  function deleteTarea(tid: string) { saveTracker(tracker.filter((t) => t.id !== tid)); }

  // Guión
  function saveGuion(updated: EscenaGuion[]) { setGuion(updated); localStorage.setItem(`guion_${id}`, JSON.stringify(updated)); }
  function addEscena() {
    const e: EscenaGuion = { id: `e${Date.now()}`, numero: guion.length + 1, titulo: "Nueva escena", personajes: "", descripcion: "", dialogo: "", notas: "" };
    saveGuion([...guion, e]);
  }
  function updateEscena(eid: string, field: keyof EscenaGuion, value: string | number) {
    saveGuion(guion.map((e) => e.id === eid ? { ...e, [field]: value } : e));
  }
  function deleteEscena(eid: string) { saveGuion(guion.filter((e) => e.id !== eid)); }

  // Guión Técnico
  function savePlanos(updated: PlanoTecnico[]) { setPlanos(updated); localStorage.setItem(`planos_${id}`, JSON.stringify(updated)); }
  function addPlano() {
    const p: PlanoTecnico = { id: `p${Date.now()}`, idPlano: `P${String(planos.length + 1).padStart(4, "0")}`, escena: "", extInt: "INT", locacion: "", valorPlano: "PM", descripcion: "", personajes: "", movimiento: "", props: "" };
    savePlanos([...planos, p]);
  }
  function updatePlano(pid: string, field: keyof PlanoTecnico, value: string) {
    savePlanos(planos.map((p) => p.id === pid ? { ...p, [field]: value } : p));
  }
  function deletePlano(pid: string) { savePlanos(planos.filter((p) => p.id !== pid)); }

  // Timeline
  function saveTimeline(updated: TareaTimeline[]) { setTimeline(updated); localStorage.setItem(`timeline_${id}`, JSON.stringify(updated)); }
  function updateTT(tid: string, field: keyof TareaTimeline, value: string | number) {
    saveTimeline(timeline.map((t) => t.id === tid ? { ...t, [field]: value } : t));
  }
  function addTT(fase: string) {
    const t: TareaTimeline = { id: `tt${Date.now()}`, wbs: "", tarea: "Nueva tarea", responsable: "Diego", inicia: "", termina: "", porcentaje: 0, fase };
    saveTimeline([...timeline, t]);
  }
  function deleteTT(tid: string) { saveTimeline(timeline.filter((t) => t.id !== tid)); }

  // Gastos
  function saveGastos(updated: Gasto[]) { setGastos(updated); localStorage.setItem(`gastos_${id}`, JSON.stringify(updated)); }
  function addGasto() {
    if (!newGasto.concepto) return;
    saveGastos([...gastos, { ...newGasto, id: `g${Date.now()}` }]);
    setNewGasto({ concepto: "", departamento: "", presupuesto: "", costoReal: "", estado: "Pendiente", notas: "" });
    setShowGastoForm(false);
  }
  function deleteGasto(gid: string) { saveGastos(gastos.filter((g) => g.id !== gid)); }

  // Computed
  const fases = PHASES.map((ph) => ({ fase: ph.label, color: ph.color, etapas: PIPELINE_STAGES.filter((s) => s.fase === ph.label) }));
  const trackerByDepto = tracker.reduce<Record<string, TareaRodaje[]>>((acc, t) => { (acc[t.departamento] ??= []).push(t); return acc; }, {});
  const totalResueltas = tracker.filter((t) => t.resuelto).length;
  const trackerPct = tracker.length > 0 ? Math.round((totalResueltas / tracker.length) * 100) : 0;
  const totalPresupuesto = gastos.reduce((s, g) => s + (parseFloat(g.presupuesto) || 0), 0);
  const totalReal        = gastos.reduce((s, g) => s + (parseFloat(g.costoReal)   || 0), 0);
  const timelineFases = [...new Set(TIMELINE_TEMPLATE.map((t) => t.fase))];

  const TABS: { key: Tab; label: string }[] = [
    { key: "general",      label: "General"        },
    { key: "produccion",   label: "Producción"     },
    { key: "guion",        label: "Guión"          },
    { key: "guion-tecnico",label: "Guión Técnico"  },
    { key: "timetable",    label: "Time Table"     },
    { key: "gastos",       label: "Gastos"         },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()}
            className="mt-0.5 text-[#6b6b6b] hover:text-[#FAFAFA] text-sm transition-colors flex-shrink-0">
            ← Pipeline
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-[#FAFAFA] font-bold text-xl truncate">{proyecto.cliente}</h1>
              {proyecto.proyecto && <span className="text-[#6b6b6b] text-sm">/ {proyecto.proyecto}</span>}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_STYLE[proyecto.estadoNorm]}`}>{proyecto.estado}</span>
              {proyecto.totalAcordado > 0 && <span className="text-[#F5C200] text-sm font-semibold">{fmt(proyecto.totalAcordado)}</span>}
            </div>
            <div className="flex items-center gap-4 text-xs text-[#6b6b6b] mb-3">
              {proyecto.representante && <span>{proyecto.representante}</span>}
              {proyecto.fechaEntrega  && <span>Entrega: <span className="text-[#F5C200]">{proyecto.fechaEntrega}</span></span>}
              <span>{pct}%</span>
            </div>
            <div className="max-w-xl"><PhaseBar porcentaje={pct} /></div>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-4 flex-wrap">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                tab === key
                  ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                  : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto">

        {/* ── GENERAL ── */}
        {tab === "general" && (
          <div className="max-w-2xl mx-auto p-6 space-y-6">
            <div>
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Encargado</p>
              <div className="flex gap-2 flex-wrap">
                {["Jesús","Diego","Alejandro","Luis Diego"].map((e) => {
                  const s = encStyle(e); const active = encargado === e;
                  return (
                    <button key={e} onClick={() => handleEncargadoChange(active ? "" : e)}
                      className="px-3 py-1.5 rounded-full border text-xs font-medium transition-all"
                      style={active ? { background: s.text, borderColor: s.text, color: "#0a0a0a" } : { background: s.bg, borderColor: s.border, color: s.text }}>
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Etapa del proyecto</p>
              <div className="space-y-3">
                {fases.map((f) => (
                  <div key={f.fase}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: f.color }}>{f.fase}</p>
                    <div className="flex flex-wrap gap-1">
                      {f.etapas.map((s) => {
                        const key = `${s.fase}|${s.etapa}`; const active = etapaKey === key;
                        return (
                          <button key={key} onClick={() => handleEtapaChange(key)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${active ? "text-[#0a0a0a] font-semibold border-transparent" : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"}`}
                            style={active ? { background: f.color } : {}}>
                            {s.etapa} <span className={`text-[10px] ${active ? "opacity-70" : "text-[#3a3a3a]"}`}>{s.pct}%</span>
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
              <textarea value={tareas} onChange={(e) => saveT(e.target.value)}
                placeholder={"- Confirmar locación\n- Enviar call sheet\n- Revisar guion v3"}
                rows={8}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200] resize-none leading-relaxed" />
              <p className="text-[10px] text-[#3a3a3a] mt-1">Auto-guardado</p>
            </div>

            {proyecto.descripcion && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Descripción</p>
                <p className="text-[#FAFAFA] text-sm leading-relaxed bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">{proyecto.descripcion}</p>
              </div>
            )}

            {(proyecto.proforma || proyecto.presentacion) && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Documentos</p>
                <div className="space-y-2">
                  {proyecto.proforma     && <a href={proyecto.proforma}     target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F5C200] hover:underline">↗ Proforma</a>}
                  {proyecto.presentacion && <a href={proyecto.presentacion} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#F5C200] hover:underline">↗ Presentación</a>}
                </div>
              </div>
            )}

            {proyecto.material.length > 0 && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Material ({proyecto.material.length})</p>
                <div className="grid grid-cols-4 gap-3">
                  {proyecto.material.map((att) => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#F5C200] transition-colors">
                      {att.type.startsWith("image/") && att.thumbnails?.small
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={att.thumbnails.small.url} alt={att.filename} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center p-2"><span className="text-[10px] text-[#6b6b6b] text-center line-clamp-2">{att.filename}</span></div>
                      }
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCCIÓN ── */}
        {tab === "produccion" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase">Avance del rodaje</p>
              <span className="text-[#F5C200] font-bold">{trackerPct}% — {totalResueltas}/{tracker.length}</span>
            </div>
            <div className="h-1.5 bg-[#2a2a2a] rounded-full mb-6 overflow-hidden max-w-xl">
              <div className="h-full bg-[#F5C200] rounded-full transition-all duration-500" style={{ width: `${trackerPct}%` }} />
            </div>

            <div className="space-y-6">
              {Object.entries(trackerByDepto).map(([depto, items]) => {
                const color = DEPTO_COLORS[depto] ?? "#9b9b9b";
                const resueltas = items.filter((t) => t.resuelto).length;
                return (
                  <div key={depto}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{depto}</p>
                      <span className="text-xs" style={{ color: resueltas === items.length ? color : "#6b6b6b" }}>{resueltas}/{items.length}</span>
                    </div>
                    <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2a2a2a]">
                            <th className="w-8 px-3 py-2"></th>
                            <th className="text-left text-[10px] text-[#6b6b6b] font-medium uppercase tracking-widest px-2 py-2">Tarea</th>
                            <th className="text-left text-[10px] text-[#6b6b6b] font-medium uppercase tracking-widest px-2 py-2 w-36">Responsable</th>
                            <th className="text-left text-[10px] text-[#6b6b6b] font-medium uppercase tracking-widest px-2 py-2">Observaciones</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((t) => {
                            const enc = encStyle(t.responsable);
                            return (
                              <tr key={t.id} className={`border-b border-[#1a1a1a] last:border-0 ${t.resuelto ? "opacity-50" : ""}`}>
                                <td className="px-3 py-2">
                                  <button onClick={() => toggleTarea(t.id)}
                                    className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                                    style={t.resuelto ? { background: color, borderColor: color } : { borderColor: "#3a3a3a" }}>
                                    {t.resuelto && <span className="text-[#0a0a0a] text-[10px] font-bold">✓</span>}
                                  </button>
                                </td>
                                <td className={cellCls}>
                                  <input value={t.necesidad} onChange={(e) => updateTarea(t.id, "necesidad", e.target.value)}
                                    className={`${inputCls} ${t.resuelto ? "line-through text-[#3a3a3a]" : ""}`} />
                                </td>
                                <td className={cellCls}>
                                  <select value={t.responsable} onChange={(e) => updateTarea(t.id, "responsable", e.target.value)}
                                    className="bg-transparent text-[11px] font-medium border-b border-transparent hover:border-[#3a3a3a] focus:border-[#F5C200] focus:outline-none cursor-pointer transition-colors w-full"
                                    style={{ color: enc.text }}>
                                    {ENCARGADOS.map((e) => <option key={e} value={e} style={{ background: "#1a1a1a", color: "#FAFAFA" }}>{e}</option>)}
                                  </select>
                                </td>
                                <td className={cellCls}>
                                  <input value={t.observaciones} onChange={(e) => updateTarea(t.id, "observaciones", e.target.value)}
                                    placeholder="—" className={`${inputCls} text-[#6b6b6b]`} />
                                </td>
                                <td className="pr-2">
                                  <button onClick={() => deleteTarea(t.id)} className="text-[#2a2a2a] hover:text-[#ff6b6b] transition-colors text-base">×</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button onClick={() => addTarea(depto)}
                        className="w-full py-2 text-[10px] text-[#3a3a3a] hover:text-[#6b6b6b] transition-colors text-center border-t border-[#1a1a1a]">
                        + agregar tarea
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GUIÓN ── */}
        {tab === "guion" && (
          <div className="p-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase">Guión narrativo — {guion.length} escenas</p>
              <button onClick={addEscena}
                className="px-4 py-1.5 bg-[#F5C200] text-[#0a0a0a] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                + Escena
              </button>
            </div>

            {guion.length === 0 && (
              <div className="text-center py-16 text-[#3a3a3a]">
                <p className="text-4xl mb-3">🎬</p>
                <p className="text-sm">Sin escenas. Agrega la primera.</p>
              </div>
            )}

            <div className="space-y-4">
              {guion.map((e, i) => (
                <div key={e.id} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[#F5C200] font-bold text-sm flex-shrink-0">#{i + 1}</span>
                      <input value={e.titulo} onChange={(ev) => updateEscena(e.id, "titulo", ev.target.value)}
                        className="flex-1 bg-transparent text-[#FAFAFA] font-semibold text-sm border-b border-transparent hover:border-[#3a3a3a] focus:border-[#F5C200] focus:outline-none transition-colors" />
                    </div>
                    <button onClick={() => deleteEscena(e.id)} className="text-[#3a3a3a] hover:text-[#ff6b6b] transition-colors flex-shrink-0">×</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">Personajes</p>
                      <input value={e.personajes} onChange={(ev) => updateEscena(e.id, "personajes", ev.target.value)}
                        placeholder="Javier, Esteban..."
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">Notas</p>
                      <input value={e.notas} onChange={(ev) => updateEscena(e.id, "notas", ev.target.value)}
                        placeholder="Notas de producción..."
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-1.5 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">Descripción de la escena</p>
                    <textarea value={e.descripcion} onChange={(ev) => updateEscena(e.id, "descripcion", ev.target.value)}
                      placeholder="Describe la acción, el ambiente, la intención dramática..." rows={3}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-2 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200] resize-none leading-relaxed" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">Diálogo / Locución</p>
                    <textarea value={e.dialogo} onChange={(ev) => updateEscena(e.id, "dialogo", ev.target.value)}
                      placeholder="JAVIER: (a cámara) Aquí el texto del personaje..." rows={4}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-2.5 py-2 text-xs text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200] resize-none leading-relaxed font-mono" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── GUIÓN TÉCNICO ── */}
        {tab === "guion-tecnico" && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase">Shot list — {planos.length} planos</p>
              <button onClick={addPlano}
                className="px-4 py-1.5 bg-[#F5C200] text-[#0a0a0a] text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
                + Plano
              </button>
            </div>

            {planos.length === 0 && (
              <div className="text-center py-16 text-[#3a3a3a]">
                <p className="text-4xl mb-3">🎥</p>
                <p className="text-sm">Sin planos. Agrega el primero.</p>
              </div>
            )}

            <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-x-auto">
              {planos.length > 0 && (
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      {["ID Plano","Escena","E/I","Locación","Valor","Descripción","Personajes","Movimiento","Props",""].map((h) => (
                        <th key={h} className="text-left text-[10px] text-[#6b6b6b] font-medium uppercase tracking-widest px-2 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {planos.map((p) => (
                      <tr key={p.id} className="border-b border-[#1a1a1a] last:border-0 hover:bg-[#1a1a1a] group">
                        <td className={cellCls}><input value={p.idPlano} onChange={(e) => updatePlano(p.id, "idPlano", e.target.value)} className={`${inputCls} w-16 text-[#F5C200] font-mono`} /></td>
                        <td className={cellCls}><input value={p.escena} onChange={(e) => updatePlano(p.id, "escena", e.target.value)} className={`${inputCls} w-12`} /></td>
                        <td className={cellCls}>
                          <select value={p.extInt} onChange={(e) => updatePlano(p.id, "extInt", e.target.value)}
                            className="bg-transparent text-[11px] text-[#FAFAFA] border-b border-transparent hover:border-[#3a3a3a] focus:border-[#F5C200] focus:outline-none cursor-pointer w-12">
                            <option value="INT" style={{ background: "#1a1a1a" }}>INT</option>
                            <option value="EXT" style={{ background: "#1a1a1a" }}>EXT</option>
                          </select>
                        </td>
                        <td className={cellCls}><input value={p.locacion} onChange={(e) => updatePlano(p.id, "locacion", e.target.value)} className={`${inputCls} w-24`} /></td>
                        <td className={cellCls}><input value={p.valorPlano} onChange={(e) => updatePlano(p.id, "valorPlano", e.target.value)} className={`${inputCls} w-16`} /></td>
                        <td className={cellCls}><input value={p.descripcion} onChange={(e) => updatePlano(p.id, "descripcion", e.target.value)} className={`${inputCls} w-48`} /></td>
                        <td className={cellCls}><input value={p.personajes} onChange={(e) => updatePlano(p.id, "personajes", e.target.value)} className={`${inputCls} w-24`} /></td>
                        <td className={cellCls}><input value={p.movimiento} onChange={(e) => updatePlano(p.id, "movimiento", e.target.value)} className={`${inputCls} w-24`} /></td>
                        <td className={cellCls}><input value={p.props} onChange={(e) => updatePlano(p.id, "props", e.target.value)} className={`${inputCls} w-20`} /></td>
                        <td className="pr-2">
                          <button onClick={() => deletePlano(p.id)} className="opacity-0 group-hover:opacity-100 text-[#6b6b6b] hover:text-[#ff6b6b] transition-all text-base">×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TIME TABLE ── */}
        {tab === "timetable" && (
          <div className="p-6">
            <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-6">Cronograma del proyecto</p>
            <div className="space-y-6">
              {timelineFases.map((fase) => {
                const items = timeline.filter((t) => t.fase === fase);
                const color = FASE_COLORS[fase] ?? "#9b9b9b";
                const fasePct = items.length > 0 ? Math.round(items.reduce((s, t) => s + t.porcentaje, 0) / items.length) : 0;
                return (
                  <div key={fase}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{fase}</p>
                      <span className="text-xs" style={{ color }}>{fasePct}%</span>
                    </div>
                    <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#2a2a2a]">
                            {["WBS","Tarea","Responsable","Inicia","Termina","%",""].map((h) => (
                              <th key={h} className="text-left text-[10px] text-[#6b6b6b] font-medium uppercase tracking-widest px-3 py-2">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((t) => {
                            const enc = encStyle(t.responsable);
                            return (
                              <tr key={t.id} className="border-b border-[#1a1a1a] last:border-0 group">
                                <td className={cellCls}><input value={t.wbs} onChange={(e) => updateTT(t.id, "wbs", e.target.value)} className={`${inputCls} w-12 text-[#6b6b6b] font-mono`} /></td>
                                <td className={cellCls}><input value={t.tarea} onChange={(e) => updateTT(t.id, "tarea", e.target.value)} className={`${inputCls}`} /></td>
                                <td className={`${cellCls} w-36`}>
                                  <select value={t.responsable} onChange={(e) => updateTT(t.id, "responsable", e.target.value)}
                                    className="bg-transparent text-[11px] font-medium border-b border-transparent hover:border-[#3a3a3a] focus:border-[#F5C200] focus:outline-none cursor-pointer w-full"
                                    style={{ color: enc.text }}>
                                    {ENCARGADOS.map((e) => <option key={e} value={e} style={{ background: "#1a1a1a", color: "#FAFAFA" }}>{e}</option>)}
                                  </select>
                                </td>
                                <td className={cellCls}><input type="date" value={t.inicia} onChange={(e) => updateTT(t.id, "inicia", e.target.value)} className={`${inputCls} w-32`} /></td>
                                <td className={cellCls}><input type="date" value={t.termina} onChange={(e) => updateTT(t.id, "termina", e.target.value)} className={`${inputCls} w-32`} /></td>
                                <td className={cellCls}>
                                  <div className="flex items-center gap-2">
                                    <input type="number" min={0} max={100} value={t.porcentaje}
                                      onChange={(e) => updateTT(t.id, "porcentaje", parseInt(e.target.value) || 0)}
                                      className={`${inputCls} w-12`} style={{ color }} />
                                    <span className="text-[10px]" style={{ color }}>%</span>
                                  </div>
                                </td>
                                <td className="pr-2">
                                  <button onClick={() => deleteTT(t.id)} className="opacity-0 group-hover:opacity-100 text-[#6b6b6b] hover:text-[#ff6b6b] transition-all text-base">×</button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <button onClick={() => addTT(fase)}
                        className="w-full py-2 text-[10px] text-[#3a3a3a] hover:text-[#6b6b6b] transition-colors text-center border-t border-[#1a1a1a]">
                        + agregar tarea
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GASTOS ── */}
        {tab === "gastos" && (
          <div className="p-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Presupuesto", value: `$${totalPresupuesto.toLocaleString()}`, color: "#FAFAFA" },
                { label: "Real",        value: `$${totalReal.toLocaleString()}`,        color: totalReal > totalPresupuesto ? "#ff6b6b" : "#22c55e" },
                { label: "Diferencia",  value: `${totalReal > totalPresupuesto ? "-" : "+"}$${Math.abs(totalPresupuesto - totalReal).toLocaleString()}`, color: totalReal > totalPresupuesto ? "#ff6b6b" : "#22c55e" },
              ].map((s) => (
                <div key={s.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-[10px] text-[#6b6b6b] uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 mb-4">
              {gastos.length === 0 && !showGastoForm && (
                <p className="text-[#6b6b6b] text-sm py-8 text-center">Sin gastos registrados.</p>
              )}
              {gastos.map((g) => (
                <div key={g.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FAFAFA] text-sm font-medium truncate">{g.concepto}</p>
                    {g.departamento && <p className="text-[#6b6b6b] text-xs">{g.departamento}</p>}
                    {g.notas        && <p className="text-[#6b6b6b] text-xs truncate">{g.notas}</p>}
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-[#6b6b6b]">Ppto</p>
                      <p className="text-sm text-[#FAFAFA] font-medium">${parseFloat(g.presupuesto || "0").toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#6b6b6b]">Real</p>
                      <p className="text-sm font-medium" style={{ color: parseFloat(g.costoReal || "0") > parseFloat(g.presupuesto || "0") ? "#ff6b6b" : "#22c55e" }}>
                        ${parseFloat(g.costoReal || "0").toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${
                      g.estado === "Pagado"  ? "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]" :
                      g.estado === "Parcial" ? "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]" :
                                               "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]"
                    }`}>{g.estado}</span>
                    <button onClick={() => deleteGasto(g.id)} className="text-[#3a3a3a] hover:text-[#ff6b6b] transition-colors text-lg">×</button>
                  </div>
                </div>
              ))}
            </div>

            {showGastoForm ? (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Concepto *" value={newGasto.concepto}
                    onChange={(e) => setNewGasto((g) => ({ ...g, concepto: e.target.value }))}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                  <input type="text" placeholder="Departamento" value={newGasto.departamento}
                    onChange={(e) => setNewGasto((g) => ({ ...g, departamento: e.target.value }))}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" placeholder="Presupuesto" value={newGasto.presupuesto}
                    onChange={(e) => setNewGasto((g) => ({ ...g, presupuesto: e.target.value }))}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                  <input type="number" placeholder="Costo Real" value={newGasto.costoReal}
                    onChange={(e) => setNewGasto((g) => ({ ...g, costoReal: e.target.value }))}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                  <select value={newGasto.estado} onChange={(e) => setNewGasto((g) => ({ ...g, estado: e.target.value as Gasto["estado"] }))}
                    className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#F5C200]">
                    <option>Pendiente</option><option>Pagado</option><option>Parcial</option>
                  </select>
                </div>
                <input type="text" placeholder="Notas" value={newGasto.notas}
                  onChange={(e) => setNewGasto((g) => ({ ...g, notas: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200]" />
                <div className="flex gap-2">
                  <button onClick={addGasto} className="flex-1 bg-[#F5C200] text-[#0a0a0a] text-sm font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity">Agregar</button>
                  <button onClick={() => setShowGastoForm(false)} className="px-4 bg-[#2a2a2a] text-[#6b6b6b] text-sm py-2 rounded-lg hover:text-[#FAFAFA] transition-colors">Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowGastoForm(true)}
                className="w-full border border-dashed border-[#2a2a2a] rounded-xl py-3 text-sm text-[#6b6b6b] hover:border-[#F5C200] hover:text-[#F5C200] transition-all">
                + Agregar gasto
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

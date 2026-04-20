"use client";

import { useState, useCallback } from "react";
import { type Proyecto, fmt } from "@/lib/airtable";
import { updatePorcentaje, updateTareasPendientes } from "@/app/actions/pipeline";

// ── Fases del pipeline con sus rangos de porcentaje ──────────────────────────
const PHASES = [
  { label: "Creatividad",     min: 0,   max: 24,  color: "#F5C200", desc: "Propuesta, concepto, seguimiento" },
  { label: "Pre-Producción",  min: 25,  max: 49,  color: "#4a9eff", desc: "Guion, casting, locaciones, permisos" },
  { label: "Producción",      min: 50,  max: 74,  color: "#f97316", desc: "Shoot days, gear, call sheets" },
  { label: "Post / Entrega",  min: 75,  max: 100, color: "#a855f7", desc: "Montaje, color, sonido, VFX, entrega" },
];

function getPhase(pct: number) {
  return PHASES.find((p) => pct >= p.min && pct <= p.max) ?? PHASES[0];
}

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  aun_no:     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  cancelado:  "bg-[#ff444420] text-[#ff6b6b] border-[#ff444440]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

// ── Componente de barra de fases ─────────────────────────────────────────────
function PhaseBar({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="w-full">
      {/* Labels */}
      <div className="grid grid-cols-4 mb-1">
        {PHASES.map((p) => {
          const active = porcentaje >= p.min;
          const current = porcentaje >= p.min && porcentaje <= p.max;
          return (
            <div key={p.label} className="text-center">
              <p className={`text-[10px] font-medium truncate px-0.5 ${
                current ? "text-[#FAFAFA]" : active ? "text-[#6b6b6b]" : "text-[#3a3a3a]"
              }`}>{p.label}</p>
            </div>
          );
        })}
      </div>

      {/* Barra segmentada */}
      <div className="flex gap-0.5 h-2.5">
        {PHASES.map((p) => {
          const filled = porcentaje >= p.max + 1;
          const current = porcentaje >= p.min && porcentaje <= p.max;
          const pctInPhase = current
            ? Math.round(((porcentaje - p.min) / (p.max - p.min)) * 100)
            : 0;

          return (
            <div key={p.label} className="flex-1 bg-[#2a2a2a] rounded-sm overflow-hidden relative">
              {filled && (
                <div className="absolute inset-0 rounded-sm" style={{ background: p.color, opacity: 0.7 }} />
              )}
              {current && (
                <div className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
                  style={{ width: `${pctInPhase}%`, background: p.color }} />
              )}
            </div>
          );
        })}
      </div>

      {/* % labels de cada fase */}
      <div className="grid grid-cols-4 mt-0.5">
        {PHASES.map((p) => (
          <div key={p.label} className="text-center">
            <p className="text-[9px] text-[#3a3a3a]">{p.min}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PipelineView({ proyectos }: { proyectos: Proyecto[] }) {
  const [selected, setSelected]       = useState<Proyecto | null>(null);
  const [tareas, setTareas]           = useState("");
  const [pctEdit, setPctEdit]         = useState<number>(0);
  const [saving, setSaving]           = useState(false);
  const [filterFase, setFilterFase]   = useState("Todas");
  const [search, setSearch]           = useState("");

  // Excluir cancelados por defecto, mostrarlos con filtro
  const activos = proyectos.filter((p) => p.estadoNorm !== "cancelado");

  const filtered = activos.filter((p) => {
    const fase = getPhase(p.porcentaje).label;
    return (
      (filterFase === "Todas" || fase === filterFase) &&
      (p.nombre.toLowerCase().includes(search.toLowerCase()) ||
       p.representante.toLowerCase().includes(search.toLowerCase()))
    );
  });

  // Agrupados por fase para los contadores
  const byPhase = PHASES.map((ph) => ({
    ...ph,
    count: activos.filter((p) => getPhase(p.porcentaje).label === ph.label).length,
  }));

  function openDetail(p: Proyecto) {
    setSelected(p);
    setPctEdit(p.porcentaje);
    // Cargar tareas de localStorage (fallback mientras no hay campo en Airtable)
    const saved = localStorage.getItem(`tasks_${p.id}`);
    setTareas(saved ?? "");
  }

  const saveTareas = useCallback(async (id: string, text: string) => {
    localStorage.setItem(`tasks_${id}`, text);
    await updateTareasPendientes(id, text);
  }, []);

  async function handleSavePct() {
    if (!selected) return;
    setSaving(true);
    await updatePorcentaje(selected.id, pctEdit);
    setSaving(false);
    setSelected((s) => s ? { ...s, porcentaje: pctEdit } : s);
  }

  return (
    <div className="flex gap-5 h-full">
      {/* ── Panel principal ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Contadores por fase */}
        <div className="grid grid-cols-4 gap-3">
          {byPhase.map((ph) => (
            <button
              key={ph.label}
              onClick={() => setFilterFase(filterFase === ph.label ? "Todas" : ph.label)}
              className={`rounded-xl p-3.5 border text-left transition-all ${
                filterFase === ph.label
                  ? "border-[#F5C200] bg-[#F5C20010]"
                  : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#3a3a3a]"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: ph.color }} />
                <p className="text-xs text-[#6b6b6b] truncate">{ph.label}</p>
              </div>
              <p className="text-2xl font-bold text-[#FAFAFA]">{ph.count}</p>
              <p className="text-[10px] text-[#3a3a3a] mt-0.5 truncate">{ph.desc}</p>
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar proyecto o representante..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
        />

        {/* Cards */}
        <div className="space-y-3 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-[#6b6b6b] text-sm pt-2">Sin proyectos en esta fase.</p>
          )}
          {filtered.map((p) => {
            const fase = getPhase(p.porcentaje);
            return (
              <div
                key={p.id}
                onClick={() => openDetail(p)}
                className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] ${
                  selected?.id === p.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#FAFAFA] font-semibold text-sm truncate">{p.nombre}</p>
                    <p className="text-[#6b6b6b] text-xs mt-0.5">
                      {p.representante}
                      {p.fechaEntrega && <> · <span className="text-[#F5C200]">{p.fechaEntrega}</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium border"
                      style={{
                        background: `${fase.color}15`,
                        color: fase.color,
                        borderColor: `${fase.color}40`,
                      }}
                    >
                      {fase.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_STYLE[p.estadoNorm]}`}>
                      {p.estado}
                    </span>
                    <span className="text-sm font-bold text-[#F5C200]">{p.porcentaje}%</span>
                  </div>
                </div>

                {/* Barra de fases */}
                <PhaseBar porcentaje={p.porcentaje} />

                {/* Valor */}
                {p.totalAcordado > 0 && (
                  <p className="text-xs text-[#6b6b6b] mt-2 text-right">{fmt(p.totalAcordado)}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Panel de detalle ── */}
      {selected && (
        <div className="w-96 flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[#FAFAFA] font-semibold leading-snug flex-1">{selected.nombre}</p>
              <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl flex-shrink-0">×</button>
            </div>
            <p className="text-[#6b6b6b] text-xs mt-1">{selected.representante} · {selected.fechaEntrega || "Sin fecha"}</p>

            {/* Fase actual */}
            <div className="mt-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[#6b6b6b]">Fase actual</p>
                <p className="text-xs font-bold" style={{ color: getPhase(selected.porcentaje).color }}>
                  {getPhase(selected.porcentaje).label}
                </p>
              </div>
              <PhaseBar porcentaje={selected.porcentaje} />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Editar porcentaje */}
            <div>
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Avance del proyecto</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={pctEdit}
                  onChange={(e) => setPctEdit(Number(e.target.value))}
                  className="flex-1 accent-[#F5C200]"
                />
                <span className="text-[#F5C200] font-bold text-sm w-10 text-right">{pctEdit}%</span>
              </div>
              <button
                onClick={handleSavePct}
                disabled={saving || pctEdit === selected.porcentaje}
                className="mt-2 w-full py-2 rounded-lg text-xs font-semibold transition-all bg-[#F5C200] text-[#0a0a0a] hover:bg-[#FFD700] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Actualizar en Airtable"}
              </button>
            </div>

            {/* ── Tareas pendientes (textarea) ── */}
            <div>
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">
                Tareas pendientes
              </p>
              <textarea
                value={tareas}
                onChange={(e) => {
                  setTareas(e.target.value);
                  saveTareas(selected.id, e.target.value);
                }}
                placeholder={"- Confirmar locación\n- Enviar call sheet\n- Revisar guion v3\n- Entregar corte offline..."}
                rows={6}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#3a3a3a] focus:outline-none focus:border-[#F5C200] resize-none leading-relaxed"
              />
              <p className="text-[10px] text-[#3a3a3a] mt-1">Auto-guardado</p>
            </div>

            {/* Descripción */}
            {selected.descripcion && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Descripción</p>
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-32 overflow-y-auto">
                  {selected.descripcion}
                </p>
              </div>
            )}

            {/* Links */}
            {(selected.proforma || selected.presentacion) && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Documentos</p>
                <div className="space-y-1.5">
                  {selected.proforma && (
                    <a href={selected.proforma} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">
                      ↗ Proforma
                    </a>
                  )}
                  {selected.presentacion && (
                    <a href={selected.presentacion} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">
                      ↗ Presentación
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Material */}
            {selected.material.length > 0 && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">
                  Material ({selected.material.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selected.material.map((att) => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#F5C200] transition-colors">
                      {att.type.startsWith("image/") && att.thumbnails?.small ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.thumbnails.small.url} alt={att.filename} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-1">
                          <span className="text-[#6b6b6b] text-[9px] text-center line-clamp-2">{att.filename}</span>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

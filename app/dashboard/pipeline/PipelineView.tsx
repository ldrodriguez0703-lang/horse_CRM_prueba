"use client";

import { useState, useCallback } from "react";
import { type Proyecto, fmt, PIPELINE_STAGES, PHASES, getPhase } from "@/lib/airtable";
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

function PhaseBar({ porcentaje }: { porcentaje: number }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-4 mb-1">
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
          const w = current ? Math.round(((porcentaje - p.min) / (p.max - p.min)) * 100) : 0;
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

export default function PipelineView({ proyectos }: { proyectos: Proyecto[] }) {
  const [selected,    setSelected]    = useState<Proyecto | null>(null);
  const [tareas,      setTareas]      = useState("");
  const [etapaKey,    setEtapaKey]    = useState<string>("");   // "fase|etapa"
  const [saving,      setSaving]      = useState(false);
  const [filterFase,  setFilterFase]  = useState("Todas");
  const [search,      setSearch]      = useState("");

  const activos = proyectos.filter((p) => p.estadoNorm !== "cancelado");

  const filtered = activos.filter((p) => {
    const fase = getPhase(p.porcentaje).label;
    return (
      (filterFase === "Todas" || fase === filterFase) &&
      (p.cliente.toLowerCase().includes(search.toLowerCase()) ||
       p.proyecto.toLowerCase().includes(search.toLowerCase()) ||
       p.representante.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const byPhase = PHASES.map((ph) => ({
    ...ph,
    count: activos.filter((p) => getPhase(p.porcentaje).label === ph.label).length,
  }));

  // Etapa actual derivada del porcentaje
  function etapaFromPct(pct: number) {
    const sorted = [...PIPELINE_STAGES].sort((a, b) => b.pct - a.pct);
    return sorted.find((s) => pct >= s.pct) ?? PIPELINE_STAGES[0];
  }

  function openDetail(p: Proyecto) {
    setSelected(p);
    const stage = etapaFromPct(p.porcentaje);
    setEtapaKey(`${stage.fase}|${stage.etapa}`);
    const saved = typeof window !== "undefined" ? localStorage.getItem(`tasks_${p.id}`) ?? "" : "";
    setTareas(saved);
  }

  async function handleEtapaChange(key: string) {
    setEtapaKey(key);
    if (!selected) return;
    const [fase, etapa] = key.split("|");
    const stage = PIPELINE_STAGES.find((s) => s.fase === fase && s.etapa === etapa);
    if (!stage) return;
    setSaving(true);
    await patchPipeline(selected.id, { Porcentaje: stage.pct });
    setSaving(false);
    setSelected((s) => s ? { ...s, porcentaje: stage.pct } : s);
  }

  const saveTareas = useCallback((id: string, text: string) => {
    if (typeof window !== "undefined") localStorage.setItem(`tasks_${id}`, text);
    patchPipeline(id, { "Tareas pendientes": text });
  }, []);

  // Agrupar etapas por fase para el select
  const fases = PHASES.map((ph) => ({
    fase: ph.label,
    color: ph.color,
    etapas: PIPELINE_STAGES.filter((s) => s.fase === ph.label),
  }));

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Contadores por fase */}
        <div className="grid grid-cols-4 gap-3">
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

        {/* Búsqueda */}
        <input type="text" placeholder="Buscar cliente, proyecto o representante..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
        />

        {/* Cards */}
        <div className="space-y-3 overflow-y-auto">
          {filtered.map((p) => {
            const fase = getPhase(p.porcentaje);
            const etapa = etapaFromPct(p.porcentaje);
            return (
              <div key={p.id} onClick={() => openDetail(p)}
                className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] ${
                  selected?.id === p.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
                }`}>
                {/* Nombre cliente | nombre proyecto */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[#FAFAFA] font-bold text-sm truncate">{p.cliente}</p>
                      <p className="text-[#6b6b6b] text-sm truncate text-right">{p.proyecto}</p>
                    </div>
                    <p className="text-[#6b6b6b] text-xs mt-0.5">
                      {p.representante}
                      {p.fechaEntrega && <> · <span className="text-[#F5C200]">{p.fechaEntrega}</span></>}
                    </p>
                  </div>
                </div>

                {/* Badges + % */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                    style={{ background: `${fase.color}15`, color: fase.color, borderColor: `${fase.color}40` }}>
                    {etapa.etapa}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ESTADO_STYLE[p.estadoNorm]}`}>
                    {p.estado}
                  </span>
                  <span className="ml-auto text-sm font-bold text-[#F5C200]">{p.porcentaje}%</span>
                  {p.totalAcordado > 0 && <span className="text-xs text-[#6b6b6b]">{fmt(p.totalAcordado)}</span>}
                </div>

                <PhaseBar porcentaje={p.porcentaje} />
              </div>
            );
          })}
          {filtered.length === 0 && <p className="text-[#6b6b6b] text-sm pt-2">Sin proyectos.</p>}
        </div>
      </div>

      {/* ── Panel detalle ── */}
      {selected && (
        <div className="w-96 flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[#FAFAFA] font-bold">{selected.cliente}</p>
                {selected.proyecto && <p className="text-[#6b6b6b] text-xs mt-0.5">{selected.proyecto}</p>}
                <p className="text-[#6b6b6b] text-xs">{selected.representante} · {selected.fechaEntrega || "Sin fecha"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl flex-shrink-0">×</button>
            </div>
            <div className="mt-3">
              <PhaseBar porcentaje={selected.porcentaje} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* ── Selector de etapa ── */}
            <div>
              <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Etapa del proyecto</p>
              <div className="space-y-1.5">
                {fases.map((f) => (
                  <div key={f.fase}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: f.color }}>
                      {f.fase}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {f.etapas.map((s) => {
                        const key = `${s.fase}|${s.etapa}`;
                        const active = etapaKey === key;
                        return (
                          <button key={key} onClick={() => handleEtapaChange(key)} disabled={saving}
                            className={`text-left px-3 py-1.5 rounded-lg text-xs border transition-all ${
                              active
                                ? "text-[#0a0a0a] font-semibold border-transparent"
                                : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
                            }`}
                            style={active ? { background: f.color, borderColor: f.color } : {}}>
                            {s.etapa}
                            <span className={`ml-1 text-[10px] ${active ? "opacity-70" : "text-[#3a3a3a]"}`}>
                              {s.pct}%
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {saving && <p className="text-xs text-[#F5C200] mt-2">Guardando en Airtable...</p>}
            </div>

            {/* ── Tareas pendientes ── */}
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

            {/* Descripción */}
            {selected.descripcion && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Descripción</p>
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-28 overflow-y-auto">
                  {selected.descripcion}
                </p>
              </div>
            )}

            {/* Links */}
            {(selected.proforma || selected.presentacion) && (
              <div>
                <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">Documentos</p>
                <div className="space-y-1.5">
                  {selected.proforma    && <a href={selected.proforma}    target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">↗ Proforma</a>}
                  {selected.presentacion && <a href={selected.presentacion} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">↗ Presentación</a>}
                </div>
              </div>
            )}

            {/* Material */}
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
        </div>
      )}
    </div>
  );
}

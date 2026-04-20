"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  aun_no:     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  cancelado:  "bg-[#ff444420] text-[#ff6b6b] border-[#ff444440]",
  finalizado: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

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
  const router = useRouter();
  const [filterFase,      setFilterFase]      = useState("Todas");
  const [filterEncargado, setFilterEncargado] = useState("Todos");
  const [search,          setSearch]          = useState("");
  const [pctOverrides,    setPctOverrides]    = useState<Record<string, number>>({});
  const [encargadoMap,    setEncargadoMap]    = useState<Record<string, string>>({});
  const [etapaMap,        setEtapaMap]        = useState<Record<string, string>>({});

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

  return (
    <div className="flex flex-col gap-4 h-full">
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

      <div className="grid gap-3 overflow-y-auto" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
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
            <div key={p.id} onClick={() => router.push(`/dashboard/pipeline/${p.id}`)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] group">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[#FAFAFA] font-bold text-sm leading-tight truncate flex-1">{parts.join(" — ")}</p>
                <span className="text-[#3a3a3a] group-hover:text-[#F5C200] text-xs flex-shrink-0 transition-colors">→</span>
              </div>
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
  );
}

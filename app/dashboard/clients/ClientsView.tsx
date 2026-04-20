"use client";

import { useState } from "react";
import { type Proyecto, fmt } from "@/lib/airtable";

// Excluir: aun_no, cancelado, finalizado
const EXCLUDED: Proyecto["estadoNorm"][] = ["aun_no", "cancelado", "finalizado"];

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

type FilterKey = "todos" | "confirmado" | "en_curso";

export default function ClientsView({ proyectos }: { proyectos: Proyecto[] }) {
  const visible = proyectos.filter((p) => !EXCLUDED.includes(p.estadoNorm));

  const [selected, setSelected] = useState<Proyecto | null>(null);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<FilterKey>("todos");

  // Sumas por categoría
  const sum = (norm?: string) =>
    visible.filter((p) => !norm || p.estadoNorm === norm).reduce((s, p) => s + p.totalAcordado, 0);

  const kpis: { key: FilterKey; label: string; count: number; total: number; accent?: boolean }[] = [
    { key: "todos",      label: "Total proyectos", count: visible.length,                                      total: sum()           },
    { key: "confirmado", label: "Confirmados",      count: visible.filter(p => p.estadoNorm === "confirmado").length, total: sum("confirmado"), accent: true },
    { key: "en_curso",   label: "En proceso",       count: visible.filter(p => p.estadoNorm === "en_curso").length,   total: sum("en_curso")  },
  ];

  const filtered = visible.filter((p) =>
    (filter === "todos" || p.estadoNorm === filter) &&
    (p.cliente.toLowerCase().includes(search.toLowerCase()) ||
     p.proyecto.toLowerCase().includes(search.toLowerCase()) ||
     p.representante.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* ── KPI buttons ── */}
        <div className="grid grid-cols-3 gap-3">
          {kpis.map((k) => (
            <button key={k.key} onClick={() => setFilter(k.key)}
              className={`rounded-xl p-4 border text-left transition-all ${
                filter === k.key
                  ? k.accent
                    ? "bg-[#F5C200] border-[#F5C200]"
                    : "bg-[#1a1a1a] border-[#F5C200]"
                  : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#F5C200]"
              }`}>
              <p className={`text-xs font-medium tracking-widest uppercase mb-1 ${filter === k.key && k.accent ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>
                {k.label}
              </p>
              <p className={`text-xl font-bold ${filter === k.key && k.accent ? "text-[#0a0a0a]" : "text-[#FAFAFA]"}`}>
                {fmt(k.total)}
              </p>
              <p className={`text-xs mt-0.5 ${filter === k.key && k.accent ? "text-[#0a0a0a70]" : "text-[#6b6b6b]"}`}>
                {k.count} proyecto{k.count !== 1 ? "s" : ""}
              </p>
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <input type="text" placeholder="Buscar cliente, proyecto o representante..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
        />

        {/* Lista */}
        <div className="space-y-2 overflow-y-auto">
          {filtered.length === 0 && <p className="text-[#6b6b6b] text-sm pt-2">Sin resultados.</p>}
          {filtered.map((p) => (
            <div key={p.id} onClick={() => setSelected(p)}
              className={`bg-[#1a1a1a] border rounded-xl px-4 py-3 cursor-pointer transition-all hover:border-[#F5C200] ${
                selected?.id === p.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
              }`}>
              {/* Orden: cliente | proyecto | monto | estado */}
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-[#F5C20020] border border-[#F5C20040] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#F5C200] font-bold text-xs">{p.cliente[0]}</span>
                </div>
                {/* Cliente */}
                <div className="w-36 flex-shrink-0">
                  <p className="text-[#FAFAFA] font-semibold text-sm truncate">{p.cliente}</p>
                  <p className="text-[#6b6b6b] text-xs truncate">{p.representante}</p>
                </div>
                {/* Proyecto */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#9b9b9b] text-sm truncate">{p.proyecto || p.nombre}</p>
                  {p.fechaEntrega && <p className="text-[#3a3a3a] text-xs">{p.fechaEntrega}</p>}
                </div>
                {/* Monto */}
                <p className="text-[#F5C200] font-bold text-sm flex-shrink-0 w-24 text-right">
                  {p.totalAcordado > 0 ? fmt(p.totalAcordado) : "—"}
                </p>
                {/* Estado */}
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex-shrink-0 ${ESTADO_STYLE[p.estadoNorm] ?? ESTADO_STYLE.otro}`}>
                  {p.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel detalle */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">
          <div className="p-5 border-b border-[#1a1a1a] flex items-start justify-between gap-2">
            <div>
              <p className="text-[#FAFAFA] font-bold">{selected.cliente}</p>
              {selected.proyecto && <p className="text-[#6b6b6b] text-xs mt-0.5">{selected.proyecto}</p>}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ESTADO_STYLE[selected.estadoNorm] ?? ESTADO_STYLE.otro}`}>
                  {selected.estado}
                </span>
                <span className="text-[#F5C200] font-bold text-sm">{fmt(selected.totalAcordado)}</span>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Section label="General">
              <Row k="Representante"   v={selected.representante} />
              <Row k="Fecha creación"  v={selected.fechaCreacion} />
              <Row k="Fecha entrega"   v={selected.fechaEntrega || "—"} />
              <Row k="Avance"          v={`${selected.porcentaje}%`} />
            </Section>
            {selected.descripcion && (
              <Section label="Descripción">
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-32 overflow-y-auto">
                  {selected.descripcion}
                </p>
              </Section>
            )}
            {(selected.proforma || selected.presentacion) && (
              <Section label="Documentos">
                {selected.proforma     && <a href={selected.proforma}    target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5C200] hover:underline block">↗ Proforma</a>}
                {selected.presentacion && <a href={selected.presentacion} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5C200] hover:underline block">↗ Presentación</a>}
              </Section>
            )}
            {selected.material.length > 0 && (
              <Section label={`Material (${selected.material.length})`}>
                <div className="grid grid-cols-3 gap-1.5">
                  {selected.material.map((att) => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="aspect-square bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#F5C200] transition-colors">
                      {att.type.startsWith("image/") && att.thumbnails?.small
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={att.thumbnails.small.url} alt={att.filename} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><span className="text-[9px] text-[#6b6b6b] text-center px-1 line-clamp-2">{att.filename}</span></div>
                      }
                    </a>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">{label}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-[#6b6b6b] text-xs">{k}</span>
      <span className="text-[#FAFAFA] text-xs text-right">{v}</span>
    </div>
  );
}

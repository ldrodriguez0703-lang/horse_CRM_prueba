"use client";

import { useState } from "react";
import { type Proyecto, fmt } from "@/lib/airtable";

const ESTADO_STYLE: Record<string, string> = {
  confirmado: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  en_curso:   "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  aun_no:     "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  cancelado:  "bg-[#ff444420] text-[#ff6b6b] border-[#ff444440]",
  otro:       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

export default function ClientsView({ proyectos }: { proyectos: Proyecto[] }) {
  const [selected, setSelected] = useState<Proyecto | null>(null);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("Todos");

  const estadosUnicos = ["Todos", ...Array.from(new Set(proyectos.map((p) => p.estado))).sort()];

  const filtered = proyectos.filter((p) =>
    (filter === "Todos" || p.estado === filter) &&
    (p.nombre.toLowerCase().includes(search.toLowerCase()) ||
     p.representante.toLowerCase().includes(search.toLowerCase()))
  );

  // KPIs rápidos
  const totalAcordado = proyectos.filter(p => p.estadoNorm === "confirmado").reduce((s, p) => s + p.totalAcordado, 0);
  const enCurso       = proyectos.filter(p => p.estadoNorm === "en_curso").length;

  return (
    <div className="flex gap-5 h-full">
      {/* Lista */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">

        {/* Mini KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
            <p className="text-xs text-[#6b6b6b] uppercase tracking-widest mb-1">Total proyectos</p>
            <p className="text-xl font-bold text-[#FAFAFA]">{proyectos.length}</p>
          </div>
          <div className="bg-[#F5C200] border border-[#F5C200] rounded-xl p-3">
            <p className="text-xs text-[#0a0a0a80] uppercase tracking-widest mb-1">Confirmados</p>
            <p className="text-xl font-bold text-[#0a0a0a]">{fmt(totalAcordado)}</p>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
            <p className="text-xs text-[#6b6b6b] uppercase tracking-widest mb-1">En proceso</p>
            <p className="text-xl font-bold text-[#4a9eff]">{enCurso}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Buscar proyecto o representante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
          />
          <div className="flex gap-1.5 flex-wrap">
            {estadosUnicos.map((e) => (
              <button
                key={e}
                onClick={() => setFilter(e)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filter === e
                    ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                    : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-2.5 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-[#6b6b6b] text-sm pt-4">Sin resultados.</p>
          )}
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] ${
                selected?.id === p.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[#FAFAFA] font-semibold text-sm truncate">{p.nombre}</p>
                  <p className="text-[#6b6b6b] text-xs mt-0.5">
                    {p.representante} · {p.fechaEntrega || p.fechaCreacion}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ESTADO_STYLE[p.estadoNorm]}`}>
                    {p.estado}
                  </span>
                  <span className="text-sm font-bold text-[#F5C200]">{fmt(p.totalAcordado)}</span>
                </div>
              </div>

              {/* Barra porcentaje */}
              {p.porcentaje > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-[#6b6b6b] mb-1">
                    <span>Avance</span>
                    <span>{p.porcentaje}%</span>
                  </div>
                  <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F5C200] rounded-full"
                      style={{ width: `${Math.min(100, p.porcentaje)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panel de detalle */}
      {selected && (
        <div className="w-96 flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-[#1a1a1a]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[#FAFAFA] font-semibold leading-snug">{selected.nombre}</p>
                <p className="text-[#6b6b6b] text-xs mt-1">{selected.representante}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl flex-shrink-0">×</button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ESTADO_STYLE[selected.estadoNorm]}`}>
                {selected.estado}
              </span>
              <span className="text-[#F5C200] font-bold text-sm">{fmt(selected.totalAcordado)}</span>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            {/* Fechas + porcentaje */}
            <Section label="General">
              <Row k="Fecha creación"  v={selected.fechaCreacion} />
              <Row k="Fecha entrega"   v={selected.fechaEntrega || "—"} />
              <Row k="Avance"          v={`${selected.porcentaje}%`} />
              <Row k="Tareas"          v={`${selected.tareasCount} tareas`} />
            </Section>

            {/* Barra avance */}
            {selected.porcentaje > 0 && (
              <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F5C200] rounded-full"
                  style={{ width: `${Math.min(100, selected.porcentaje)}%` }}
                />
              </div>
            )}

            {/* Descripción */}
            {selected.descripcion && (
              <Section label="Descripción">
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-36 overflow-y-auto">
                  {selected.descripcion}
                </p>
              </Section>
            )}

            {/* Objetivo */}
            {selected.objetivo && (
              <Section label="Objetivo / Entregables">
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-36 overflow-y-auto">
                  {selected.objetivo}
                </p>
              </Section>
            )}

            {/* Links */}
            {(selected.proforma || selected.presentacion) && (
              <Section label="Documentos">
                {selected.proforma && (
                  <a href={selected.proforma} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">
                    <span>↗</span> Proforma
                  </a>
                )}
                {selected.presentacion && (
                  <a href={selected.presentacion} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-[#F5C200] hover:underline">
                    <span>↗</span> Presentación
                  </a>
                )}
              </Section>
            )}

            {/* Material adicional */}
            {selected.material.length > 0 && (
              <Section label={`Material adicional (${selected.material.length})`}>
                <div className="grid grid-cols-3 gap-2">
                  {selected.material.map((att) => (
                    <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                      className="group relative aspect-square bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg overflow-hidden hover:border-[#F5C200] transition-colors">
                      {att.type.startsWith("image/") && att.thumbnails?.small ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={att.thumbnails.small.url} alt={att.filename}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[#6b6b6b] text-xs text-center px-1 truncate">{att.filename}</span>
                        </div>
                      )}
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
    <div className="flex justify-between items-start gap-2">
      <span className="text-[#6b6b6b] text-xs flex-shrink-0">{k}</span>
      <span className="text-[#FAFAFA] text-xs text-right">{v}</span>
    </div>
  );
}

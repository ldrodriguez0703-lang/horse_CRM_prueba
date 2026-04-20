"use client";

import { useState, useRef } from "react";
import { type Proyecto, fmt, PIPELINE_STAGES, getPhase } from "@/lib/airtable";

const BASE_ID  = "appKEdyjyWLAT7dHQ";
const TABLE_ID = "tblaWMR3gJbd2xnw4";

function estadoStyle(raw: string): string {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("aprobado") || v.includes("confirm"))
    return "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]";
  if (v.includes("cobrar") || v.includes("cobro"))
    return "bg-[#f9731620] text-[#f97316] border-[#f9731640]";
  if (v.includes("seguimiento"))
    return "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]";
  if (v.includes("cotizar") || v.includes("en curso") || v.includes("proceso") || v.includes("activo"))
    return "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]";
  if (v.includes("aun") || v.includes("pendiente") || v.includes("prospecto"))
    return "bg-[#9b9b9b20] text-[#9b9b9b] border-[#9b9b9b40]";
  if (v.includes("cancel") || v.includes("muerto"))
    return "bg-[#ff444420] text-[#ff4444] border-[#ff444440]";
  if (v.includes("finaliz") || v.includes("entregado") || v.includes("terminado"))
    return "bg-[#FAFAFA20] text-[#FAFAFA] border-[#FAFAFA40]";
  return "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]";
}

function estadoPriority(raw: string): number {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("aprobado") || v.includes("confirm"))  return 1;
  if (v.includes("cobrar") || v.includes("cobro"))      return 2;
  if (v.includes("seguimiento"))                        return 3;
  if (v.includes("cotizar") || v.includes("proceso") || v.includes("activo")) return 4;
  if (v.includes("editar") || v.includes("revis"))      return 5;
  if (v.includes("aun") || v.includes("pendiente") || v.includes("prospecto")) return 6;
  if (v.includes("cancel") || v.includes("muerto"))     return 7;
  if (v.includes("finaliz") || v.includes("entregado")) return 8;
  return 9;
}

function etapaLabel(pct: number): string {
  const sorted = [...PIPELINE_STAGES].sort((a, b) => b.pct - a.pct);
  return sorted.find((s) => pct >= s.pct)?.etapa ?? "Propuesta";
}

function uniqueEstados(proyectos: Proyecto[]): string[] {
  const map = new Map<string, number>();
  for (const p of proyectos) {
    if (!map.has(p.estado)) map.set(p.estado, estadoPriority(p.estado));
  }
  return [...map.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([e]) => e);
}

type SortKey = "cliente" | "proyecto" | "estado" | "monto" | "porcentaje";
type SortDir = "asc" | "desc";
type ColWidths = { cliente: number; proyecto: number; estado: number; monto: number; porcentaje: number };

export default function ClientsView({ proyectos }: { proyectos: Proyecto[] }) {
  const [selected,     setSelected]     = useState<Proyecto | null>(null);
  const [search,       setSearch]       = useState("");
  const [filterEstado, setFilterEstado] = useState<string | null>(null);
  const [sortKey,      setSortKey]      = useState<SortKey>("estado");
  const [sortDir,      setSortDir]      = useState<SortDir>("asc");
  const [colWidths,    setColWidths]    = useState<ColWidths>({
    cliente: 200, proyecto: 240, estado: 160, monto: 120, porcentaje: 150,
  });

  const dragRef = useRef<{ col: keyof ColWidths; startX: number; startW: number } | null>(null);

  const estados = uniqueEstados(proyectos);

  const filtered = proyectos.filter((p) =>
    (filterEstado === null || p.estado === filterEstado) &&
    (p.cliente.toLowerCase().includes(search.toLowerCase()) ||
     p.proyecto.toLowerCase().includes(search.toLowerCase()) ||
     p.representante.toLowerCase().includes(search.toLowerCase()))
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if      (sortKey === "cliente")    cmp = a.cliente.localeCompare(b.cliente);
    else if (sortKey === "proyecto")   cmp = a.proyecto.localeCompare(b.proyecto);
    else if (sortKey === "estado")     cmp = estadoPriority(a.estado) - estadoPriority(b.estado) || a.estado.localeCompare(b.estado);
    else if (sortKey === "monto")      cmp = a.totalAcordado - b.totalAcordado;
    else if (sortKey === "porcentaje") cmp = a.porcentaje - b.porcentaje;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function startDrag(col: keyof ColWidths, e: React.MouseEvent) {
    e.preventDefault();
    dragRef.current = { col, startX: e.clientX, startW: colWidths[col] };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      setColWidths((w) => ({ ...w, [dragRef.current!.col]: Math.max(80, dragRef.current!.startW + delta) }));
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const COLS: { key: SortKey; label: string }[] = [
    { key: "cliente",    label: "Cliente" },
    { key: "proyecto",   label: "Proyecto" },
    { key: "estado",     label: "Estado" },
    { key: "monto",      label: "Monto" },
    { key: "porcentaje", label: "% Avance" },
  ];

  return (
    <div className="flex gap-5 h-full">
      <div className="flex-1 min-w-0 flex flex-col gap-4 overflow-hidden">

        {/* KPI buttons — one per estado */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterEstado(null)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              filterEstado === null
                ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
            }`}>
            Todos · {proyectos.length}
          </button>
          {estados.map((est) => {
            const count = proyectos.filter((p) => p.estado === est).length;
            const active = filterEstado === est;
            return (
              <button key={est} onClick={() => setFilterEstado(active ? null : est)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  active
                    ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                    : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200] hover:text-[#FAFAFA]"
                }`}>
                {est} · {count}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input type="text" placeholder="Buscar cliente, proyecto o representante..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
        />

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-[#2a2a2a]">
          <table className="text-sm border-collapse" style={{ minWidth: "100%", tableLayout: "fixed" }}>
            <colgroup>
              {COLS.map((c) => <col key={c.key} style={{ width: colWidths[c.key] }} />)}
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#111111] border-b border-[#2a2a2a]">
                {COLS.map((c) => (
                  <th key={c.key} className="relative text-left py-2.5 px-3 text-xs text-[#6b6b6b] font-medium tracking-widest uppercase select-none">
                    <button onClick={() => handleSort(c.key)} className="flex items-center gap-1 hover:text-[#FAFAFA] transition-colors">
                      {c.label}
                      {sortKey === c.key && <span className="text-[#F5C200]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                    </button>
                    <div onMouseDown={(e) => startDrag(c.key, e)}
                      className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-[#F5C20030] transition-colors" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[#6b6b6b] text-sm">Sin resultados.</td></tr>
              )}
              {sorted.map((p) => {
                const fase  = getPhase(p.porcentaje);
                const etapa = etapaLabel(p.porcentaje);
                return (
                  <tr key={p.id}
                    onClick={() => setSelected((s) => s?.id === p.id ? null : p)}
                    className={`border-b border-[#1a1a1a] cursor-pointer transition-colors hover:bg-[#1a1a1a] ${
                      selected?.id === p.id ? "bg-[#1a1a1a] outline outline-1 outline-[#F5C20040]" : ""
                    }`}>
                    <td className="py-2.5 px-3 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#F5C20020] border border-[#F5C20040] flex items-center justify-center flex-shrink-0">
                          <span className="text-[#F5C200] font-bold text-[10px]">{p.cliente[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#FAFAFA] font-semibold truncate text-sm">{p.cliente}</p>
                          <p className="text-[#6b6b6b] text-xs truncate">{p.representante}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 overflow-hidden">
                      <p className="text-[#9b9b9b] text-sm truncate">{p.proyecto || p.nombre}</p>
                      {p.fechaEntrega && <p className="text-[#3a3a3a] text-xs">{p.fechaEntrega}</p>}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ${estadoStyle(p.estado)}`}>
                        {p.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#F5C200] font-semibold text-sm">
                      {p.totalAcordado > 0 ? fmt(p.totalAcordado) : <span className="text-[#3a3a3a]">—</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${p.porcentaje}%`, background: fase.color }} />
                        </div>
                        <span className="text-xs text-[#FAFAFA] font-medium w-8 text-right flex-shrink-0">{p.porcentaje}%</span>
                      </div>
                      <p className="text-[10px] text-[#6b6b6b] mt-0.5 truncate">{etapa}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sidebar detalle ── */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl flex flex-col overflow-hidden max-h-[calc(100vh-8rem)] shadow-2xl">
          <div className="p-5 border-b border-[#1a1a1a] flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[#FAFAFA] font-bold truncate">{selected.cliente}</p>
              {selected.proyecto && <p className="text-[#6b6b6b] text-xs mt-0.5 truncate">{selected.proyecto}</p>}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${estadoStyle(selected.estado)}`}>
                  {selected.estado}
                </span>
                {selected.totalAcordado > 0 && (
                  <span className="text-[#F5C200] font-bold text-sm">{fmt(selected.totalAcordado)}</span>
                )}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl flex-shrink-0">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <Section label="General">
              <Row k="Representante" v={selected.representante} />
              <Row k="Fecha creación" v={selected.fechaCreacion} />
              <Row k="Fecha entrega" v={selected.fechaEntrega || "—"} />
              <Row k="Avance" v={`${selected.porcentaje}%`} />
            </Section>

            <Section label="Documentos">
              {selected.presentacion
                ? <a href={selected.presentacion} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5C200] hover:underline block">↗ Presentación</a>
                : <p className="text-xs text-[#3a3a3a]">Sin presentación</p>
              }
              {selected.proforma && (
                <a href={selected.proforma} target="_blank" rel="noopener noreferrer" className="text-xs text-[#F5C200] hover:underline block">↗ Proforma</a>
              )}
              <a href={`https://airtable.com/${BASE_ID}/${TABLE_ID}/${selected.id}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#4a9eff] hover:underline block mt-1">
                ↗ Ver en Airtable
              </a>
            </Section>

            {selected.descripcion && (
              <Section label="Descripción">
                <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] max-h-32 overflow-y-auto">
                  {selected.descripcion}
                </p>
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
                        : <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[9px] text-[#6b6b6b] text-center px-1 line-clamp-2">{att.filename}</span>
                          </div>
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

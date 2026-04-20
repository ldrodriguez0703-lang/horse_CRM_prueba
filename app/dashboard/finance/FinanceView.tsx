"use client";

import { useState, useEffect } from "react";
import { type Proyecto, fmt } from "@/lib/airtable";

type FacturacionVal = "Facturado" | "Por facturar" | "N/A" | "";
type StatusVal      = "Pagada" | "Pendiente" | "Mora" | "Parcial" | "";

const STATUS_OPTIONS: StatusVal[] = ["Pagada", "Pendiente", "Mora", "Parcial"];

const STATUS_STYLE: Record<string, string> = {
  Pagada:   "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  Parcial:  "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  Pendiente:"bg-[#ffffff15] text-[#FAFAFA] border-[#ffffff30]",
  Mora:     "bg-[#ff444420] text-[#ff4444] border-[#ff444440]",
  "":       "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

const FACT_STYLE: Record<string, string> = {
  "Facturado":    "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  "Por facturar": "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  "N/A":          "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
  "":             "bg-[#ffffff10] text-[#9b9b9b] border-[#ffffff20]",
};

async function patch(recordId: string, fields: Record<string, unknown>) {
  await fetch("/api/pipeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId, fields }),
  });
}

function isFacturable(raw: string): boolean {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return v.includes("aprobado") || v.includes("confirm") || v.includes("cobrar") || v.includes("cobro");
}

type DocType = "NDA" | "Contrato" | "Derechos de Imagen" | "Presupuesto";
interface Doc {
  id: string; proyecto: string; cliente: string;
  tipo: DocType; fecha: string; estado: "Firmado" | "Pendiente" | "Revisión";
}
interface BudgetItem { categoria: string; descripcion: string; qty: number; dias: number; tarifa: number; }

const DOCS: Doc[] = [
  { id: "D1", proyecto: "Campaña Cerveza X", cliente: "Bavaria",     tipo: "NDA",               fecha: "2026-04-01", estado: "Firmado"   },
  { id: "D2", proyecto: "Campaña Cerveza X", cliente: "Bavaria",     tipo: "Contrato",           fecha: "2026-04-03", estado: "Firmado"   },
  { id: "D3", proyecto: "Film Publicitario", cliente: "Avianca",     tipo: "Derechos de Imagen", fecha: "2026-04-10", estado: "Pendiente" },
  { id: "D4", proyecto: "Film Publicitario", cliente: "Avianca",     tipo: "NDA",               fecha: "2026-04-08", estado: "Firmado"   },
  { id: "D5", proyecto: "Video Corp Z",      cliente: "Bancolombia", tipo: "Contrato",           fecha: "2026-04-18", estado: "Revisión"  },
];
const DEFAULT_ITEMS: BudgetItem[] = [
  { categoria: "Cámara", descripcion: "RED Komodo 6K + Lentes",    qty: 1, dias: 2, tarifa: 800 },
  { categoria: "Cámara", descripcion: "DJI Ronin 4D (2nd cam)",    qty: 1, dias: 2, tarifa: 400 },
  { categoria: "Crew",   descripcion: "Director de Fotografía",    qty: 1, dias: 2, tarifa: 600 },
  { categoria: "Crew",   descripcion: "Director de Arte",          qty: 1, dias: 2, tarifa: 450 },
  { categoria: "Crew",   descripcion: "Gaffer + Kit Luz",          qty: 1, dias: 2, tarifa: 350 },
  { categoria: "Crew",   descripcion: "Asistente de Cámara",       qty: 1, dias: 2, tarifa: 200 },
  { categoria: "Edición",descripcion: "Editor Principal",          qty: 1, dias: 5, tarifa: 300 },
  { categoria: "Edición",descripcion: "Colorista",                 qty: 1, dias: 2, tarifa: 400 },
  { categoria: "Edición",descripcion: "Diseñador de Sonido",       qty: 1, dias: 2, tarifa: 250 },
];

const DOC_STYLE: Record<string, string> = {
  Firmado:  "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  Pendiente:"bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  Revisión: "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
};

export default function FinanceView({ proyectos }: { proyectos: Proyecto[] }) {
  const [tab,          setTab]          = useState<"facturacion" | "presupuesto" | "legal">("facturacion");
  const [items,        setItems]        = useState<BudgetItem[]>(DEFAULT_ITEMS);
  const [factMap,      setFactMap]      = useState<Record<string, FacturacionVal>>({});
  const [statusMap,    setStatusMap]    = useState<Record<string, StatusVal>>({});
  const [pagadoMap,    setPagadoMap]    = useState<Record<string, number>>({});
  const [filterStatus, setFilterStatus] = useState<StatusVal | "Todos">("Todos");

  const facturables = proyectos.filter((p) => isFacturable(p.estado));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fMap: Record<string, FacturacionVal> = {};
    const sMap: Record<string, StatusVal>      = {};
    const pMap: Record<string, number>         = {};
    for (const p of facturables) {
      const f = localStorage.getItem(`facturacion_${p.id}`) as FacturacionVal | null;
      const s = localStorage.getItem(`status_${p.id}`)      as StatusVal      | null;
      const pg = localStorage.getItem(`pagado_${p.id}`);
      if (f)  fMap[p.id] = f;
      if (s)  sMap[p.id] = s;
      if (pg) pMap[p.id] = parseFloat(pg);
    }
    setFactMap(fMap);
    setStatusMap(sMap);
    setPagadoMap(pMap);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFacturacion(id: string, value: FacturacionVal) {
    setFactMap((m) => ({ ...m, [id]: value }));
    if (typeof window !== "undefined") localStorage.setItem(`facturacion_${id}`, value);
    patch(id, { "Facturación": value });
  }

  function handleStatus(id: string, value: StatusVal) {
    setStatusMap((m) => ({ ...m, [id]: value }));
    if (typeof window !== "undefined") localStorage.setItem(`status_${id}`, value);
    patch(id, { Status: value });
  }

  function handlePagado(id: string, value: number) {
    setPagadoMap((m) => ({ ...m, [id]: value }));
    if (typeof window !== "undefined") localStorage.setItem(`pagado_${id}`, String(value));
    patch(id, { Pagado: value });
  }

  const displayed = facturables.filter((p) =>
    filterStatus === "Todos" || (statusMap[p.id] || "") === filterStatus
  );

  const budgetTotal = items.reduce((s, i) => s + i.qty * i.dias * i.tarifa, 0);

  // Totals per status for KPI buttons
  function sumByStatus(s: StatusVal | "") {
    return facturables.filter((p) => (statusMap[p.id] || "") === s).reduce((acc, p) => acc + p.totalAcordado, 0);
  }

  return (
    <div className="space-y-5">

      {/* ── Status filter buttons (act as KPIs + filters) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Todos */}
        <button onClick={() => setFilterStatus("Todos")}
          className={`rounded-xl p-4 border text-left transition-all ${
            filterStatus === "Todos" ? "bg-[#F5C200] border-[#F5C200]" : "bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#F5C200]"
          }`}>
          <p className={`text-xs uppercase tracking-widest mb-1 ${filterStatus === "Todos" ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>Todos</p>
          <p className={`text-xl font-bold ${filterStatus === "Todos" ? "text-[#0a0a0a]" : "text-[#FAFAFA]"}`}>{facturables.length}</p>
          <p className={`text-xs mt-0.5 ${filterStatus === "Todos" ? "text-[#0a0a0a70]" : "text-[#6b6b6b]"}`}>{fmt(facturables.reduce((s, p) => s + p.totalAcordado, 0))}</p>
        </button>
        {STATUS_OPTIONS.map((s) => {
          const count  = facturables.filter((p) => (statusMap[p.id] || "") === s).length;
          const active = filterStatus === s;
          const colors: Record<string, { border: string; bg: string; text: string; subtext: string }> = {
            Pagada:   { border: "#22c55e", bg: "#22c55e15", text: "#22c55e", subtext: "#22c55e90" },
            Parcial:  { border: "#F5C200", bg: "#F5C20015", text: "#F5C200", subtext: "#F5C20090" },
            Pendiente:{ border: "#ffffff40", bg: "#ffffff08", text: "#FAFAFA", subtext: "#9b9b9b" },
            Mora:     { border: "#ff4444", bg: "#ff444415", text: "#ff4444", subtext: "#ff444490" },
          };
          const c = colors[s];
          return (
            <button key={s} onClick={() => setFilterStatus(active ? "Todos" : s)}
              className="rounded-xl p-4 border text-left transition-all"
              style={active
                ? { background: c.bg, borderColor: c.border }
                : { background: "#1a1a1a", borderColor: "#2a2a2a" }
              }>
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: active ? c.text : "#6b6b6b" }}>{s}</p>
              <p className="text-xl font-bold" style={{ color: active ? c.text : "#FAFAFA" }}>{count}</p>
              <p className="text-xs mt-0.5" style={{ color: active ? c.subtext : "#6b6b6b" }}>{fmt(sumByStatus(s))}</p>
            </button>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "facturacion" as const, label: "Facturación" },
          { id: "presupuesto" as const, label: "Generador de Presupuesto" },
          { id: "legal"       as const, label: "Repositorio Legal" },
        ]).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              tab === t.id ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]" : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Facturación ── */}
      {tab === "facturacion" && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2a2a2a]">
                <tr>
                  {["#", "Cliente", "Proyecto", "Monto", "Status", "Estado", "Facturación", "Fecha entrega"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-[#6b6b6b] text-sm">Sin proyectos.</td></tr>
                )}
                {displayed.map((p, i) => {
                  const fact     = factMap[p.id]  || "";
                  const status   = statusMap[p.id] || "";
                  const pagado   = pagadoMap[p.id] ?? 0;
                  const pendiente = Math.max(0, p.totalAcordado - pagado);
                  return (
                    <tr key={p.id} className={`border-b border-[#1f1f1f] hover:bg-[#2a2a2a20] transition-colors ${status === "Mora" ? "bg-[#ff444406]" : ""}`}>
                      <td className="py-3 px-4 text-[#6b6b6b] font-mono text-xs">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-3 px-4 text-[#FAFAFA] font-medium max-w-[140px]">
                        <p className="truncate">{p.cliente}</p>
                        <p className="text-xs text-[#6b6b6b] truncate">{p.representante}</p>
                      </td>
                      <td className="py-3 px-4 text-[#9b9b9b] max-w-[160px]">
                        <p className="truncate">{p.proyecto || p.nombre}</p>
                      </td>
                      {/* Total */}
                      <td className="py-3 px-4 text-[#FAFAFA] font-semibold whitespace-nowrap">
                        {p.totalAcordado > 0 ? fmt(p.totalAcordado) : "—"}
                      </td>
                      {/* Pagado — editable */}
                      <td className="py-3 px-4">
                        <input
                          type="number" min="0" value={pagado === 0 ? "" : pagado}
                          placeholder="0"
                          onChange={(e) => handlePagado(p.id, parseFloat(e.target.value) || 0)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-28 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-[#22c55e] text-right focus:outline-none focus:border-[#F5C200]"
                        />
                      </td>
                      {/* Pendiente — calculado */}
                      <td className={`py-3 px-4 font-semibold whitespace-nowrap text-sm ${pendiente > 0 ? "text-[#F5C200]" : "text-[#6b6b6b]"}`}>
                        {fmt(pendiente)}
                      </td>
                      {/* Status — colored badge overlay */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium pointer-events-none ${STATUS_STYLE[status]}`}>
                            {status || "— Status —"}
                          </span>
                          <select
                            value={status}
                            onChange={(e) => handleStatus(p.id, e.target.value as StatusVal)}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 opacity-0 w-full cursor-pointer">
                            <option value="">— Status —</option>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </td>
                      {/* Facturación — changeable */}
                      <td className="py-3 px-4">
                        <div className="relative inline-block">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium pointer-events-none ${FACT_STYLE[fact]}`}>
                            {fact || "— Facturación —"}
                          </span>
                          <select
                            value={fact}
                            onChange={(e) => handleFacturacion(p.id, e.target.value as FacturacionVal)}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 opacity-0 w-full cursor-pointer">
                            <option value="">— Facturación —</option>
                            <option value="Por facturar">Por facturar</option>
                            <option value="Facturado">Facturado</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#6b6b6b] text-xs whitespace-nowrap">
                        {p.fechaEntrega || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Presupuesto ── */}
      {tab === "presupuesto" && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-[#FAFAFA]">Generador de Presupuesto</p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6b6b6b]">Agencia (20%)</span>
              <p className="text-xl font-bold text-[#F5C200]">{fmt(budgetTotal * 1.2)}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2a2a2a]">
                <tr>
                  {["Categoría", "Descripción", "Qty", "Días", "Tarifa/día", "Subtotal"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} className="border-b border-[#1f1f1f]">
                    <td className="py-2 px-3 text-[#F5C200] text-xs font-medium">{item.categoria}</td>
                    <td className="py-2 px-3 text-[#FAFAFA]">{item.descripcion}</td>
                    <td className="py-2 px-3">
                      <input type="number" value={item.qty}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, qty: +e.target.value } : it))}
                        className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" value={item.dias}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, dias: +e.target.value } : it))}
                        className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]" />
                    </td>
                    <td className="py-2 px-3">
                      <input type="number" value={item.tarifa}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, tarifa: +e.target.value } : it))}
                        className="w-20 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]" />
                    </td>
                    <td className="py-2 px-3 text-[#F5C200] font-semibold">{fmt(item.qty * item.dias * item.tarifa)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#F5C200]">
                <tr>
                  <td colSpan={5} className="py-3 px-3 text-right text-sm font-medium text-[#6b6b6b]">Neto</td>
                  <td className="py-3 px-3 text-[#FAFAFA] font-bold">{fmt(budgetTotal)}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="py-2 px-3 text-right text-sm font-medium text-[#6b6b6b]">+ Agencia 20%</td>
                  <td className="py-2 px-3 text-[#F5C200] font-bold text-lg">{fmt(budgetTotal * 1.2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Legal ── */}
      {tab === "legal" && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2a2a2a]">
                <tr>
                  {["Documento", "Proyecto", "Cliente", "Tipo", "Fecha", "Estado", "Acción"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DOCS.map((doc) => (
                  <tr key={doc.id} className="border-b border-[#1f1f1f] hover:bg-[#2a2a2a20] transition-colors">
                    <td className="py-3 px-4 text-[#6b6b6b] font-mono text-xs">{doc.id}</td>
                    <td className="py-3 px-4 text-[#FAFAFA] font-medium">{doc.proyecto}</td>
                    <td className="py-3 px-4 text-[#6b6b6b]">{doc.cliente}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-[#2a2a2a] text-[#FAFAFA] px-2 py-1 rounded">{doc.tipo}</span>
                    </td>
                    <td className="py-3 px-4 text-[#6b6b6b] text-xs">{doc.fecha}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${DOC_STYLE[doc.estado]}`}>{doc.estado}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-xs text-[#F5C200] hover:underline">Ver</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-[#2a2a2a]">
            <button className="px-4 py-2 bg-[#F5C200] text-[#0a0a0a] text-sm font-semibold rounded-lg hover:bg-[#FFD700] transition-colors">
              + Subir Documento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

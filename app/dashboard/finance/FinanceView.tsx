"use client";

import { useState, useEffect } from "react";
import { type Proyecto, fmt } from "@/lib/airtable";

type FacturacionVal = "Facturado" | "Por facturar" | "N/A" | "";

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
  const [tab,       setTab]       = useState<"facturacion" | "presupuesto" | "legal">("facturacion");
  const [items,     setItems]     = useState<BudgetItem[]>(DEFAULT_ITEMS);
  const [factMap,   setFactMap]   = useState<Record<string, FacturacionVal>>({});
  const [estadoMap, setEstadoMap] = useState<Record<string, string>>({});

  const facturables = proyectos.filter((p) => isFacturable(p.estado));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const map: Record<string, FacturacionVal> = {};
    for (const p of facturables) {
      const stored = localStorage.getItem(`facturacion_${p.id}`) as FacturacionVal | null;
      if (stored) map[p.id] = stored;
    }
    setFactMap(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFacturacion(id: string, value: FacturacionVal) {
    setFactMap((m) => ({ ...m, [id]: value }));
    if (typeof window !== "undefined") localStorage.setItem(`facturacion_${id}`, value);
    patch(id, { Facturación: value });
  }

  function handleEstado(id: string, value: string) {
    setEstadoMap((m) => ({ ...m, [id]: value }));
    patch(id, { ESTADO: value });
  }

  const totalMonto     = facturables.reduce((s, p) => s + p.totalAcordado, 0);
  const porFacturar    = facturables.filter((p) => (factMap[p.id] || "") === "Por facturar").reduce((s, p) => s + p.totalAcordado, 0);
  const totalFacturado = facturables.filter((p) => (factMap[p.id] || "") === "Facturado").reduce((s, p) => s + p.totalAcordado, 0);
  const budgetTotal    = items.reduce((s, i) => s + i.qty * i.dias * i.tarifa, 0);

  const allEstados = [...new Set(proyectos.map((p) => p.estado))].sort();

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total aprobado",  v: fmt(totalMonto),        accent: false },
          { l: "Por facturar",    v: fmt(porFacturar),       accent: true  },
          { l: "Facturado",       v: fmt(totalFacturado),    accent: false },
          { l: "Proyectos",       v: `${facturables.length}`,accent: false },
        ].map((k) => (
          <div key={k.l} className={`rounded-xl p-5 border ${k.accent ? "bg-[#F5C200] border-[#F5C200]" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
            <p className={`text-xs uppercase tracking-widest mb-2 ${k.accent ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>{k.l}</p>
            <p className={`text-xl font-bold ${k.accent ? "text-[#0a0a0a]" : "text-[#FAFAFA]"}`}>{k.v}</p>
          </div>
        ))}
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
                  {["#", "Cliente", "Proyecto", "Monto", "Estado", "Facturación", "Fecha entrega"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {facturables.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-[#6b6b6b] text-sm">Sin proyectos aprobados o por cobrar.</td></tr>
                )}
                {facturables.map((p, i) => {
                  const fact   = factMap[p.id] || "";
                  const estado = estadoMap[p.id] || p.estado;
                  return (
                    <tr key={p.id} className="border-b border-[#1f1f1f] hover:bg-[#2a2a2a20] transition-colors">
                      <td className="py-3 px-4 text-[#6b6b6b] font-mono text-xs">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-3 px-4 text-[#FAFAFA] font-medium max-w-[140px]">
                        <p className="truncate">{p.cliente}</p>
                        <p className="text-xs text-[#6b6b6b] truncate">{p.representante}</p>
                      </td>
                      <td className="py-3 px-4 text-[#9b9b9b] max-w-[180px]">
                        <p className="truncate">{p.proyecto || p.nombre}</p>
                      </td>
                      <td className="py-3 px-4 text-[#F5C200] font-semibold whitespace-nowrap">
                        {p.totalAcordado > 0 ? fmt(p.totalAcordado) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={estado}
                          onChange={(e) => handleEstado(p.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs text-[#FAFAFA] focus:outline-none focus:border-[#F5C200] cursor-pointer min-w-[120px]">
                          {allEstados.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={fact}
                          onChange={(e) => handleFacturacion(p.id, e.target.value as FacturacionVal)}
                          onClick={(e) => e.stopPropagation()}
                          className={`border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#F5C200] cursor-pointer min-w-[120px] ${
                            fact === "Facturado"    ? "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]"
                            : fact === "Por facturar" ? "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]"
                            : "bg-[#0a0a0a] text-[#9b9b9b] border-[#2a2a2a]"
                          }`}>
                          <option value="">— Facturación —</option>
                          <option value="Por facturar">Por facturar</option>
                          <option value="Facturado">Facturado</option>
                          <option value="N/A">N/A</option>
                        </select>
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

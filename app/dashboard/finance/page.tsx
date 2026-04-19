"use client";

import { useState } from "react";

type InvoiceStatus = "Pagada" | "Pendiente" | "Mora" | "Parcial";
type DocType = "NDA" | "Contrato" | "Derechos de Imagen" | "Presupuesto";

interface Invoice {
  id: string;
  proyecto: string;
  cliente: string;
  monto: number;
  pagado: number;
  status: InvoiceStatus;
  fechaEmision: string;
  fechaVencimiento: string;
}

interface Doc {
  id: string;
  proyecto: string;
  cliente: string;
  tipo: DocType;
  fecha: string;
  estado: "Firmado" | "Pendiente" | "Revisión";
}

interface BudgetItem {
  categoria: string;
  descripcion: string;
  qty: number;
  dias: number;
  tarifa: number;
}

const INVOICES: Invoice[] = [
  { id: "INV-001", proyecto: "Campaña Cerveza X", cliente: "Bavaria", monto: 18500, pagado: 9250, status: "Parcial", fechaEmision: "2026-04-05", fechaVencimiento: "2026-05-05" },
  { id: "INV-002", proyecto: "Documental Marca Y", cliente: "Claro", monto: 12000, pagado: 12000, status: "Pagada", fechaEmision: "2026-03-15", fechaVencimiento: "2026-04-15" },
  { id: "INV-003", proyecto: "Campaña Digital Q1", cliente: "Samsung", monto: 15000, pagado: 15000, status: "Pagada", fechaEmision: "2026-03-01", fechaVencimiento: "2026-03-31" },
  { id: "INV-004", proyecto: "Film Publicitario", cliente: "Avianca", monto: 35000, pagado: 17500, status: "Parcial", fechaEmision: "2026-04-10", fechaVencimiento: "2026-05-10" },
  { id: "INV-005", proyecto: "Video Corporativo Z", cliente: "Bancolombia", monto: 8000, pagado: 0, status: "Pendiente", fechaEmision: "2026-04-18", fechaVencimiento: "2026-05-18" },
  { id: "INV-006", proyecto: "TVC Navidad", cliente: "Éxito", monto: 25000, pagado: 0, status: "Mora", fechaEmision: "2026-03-01", fechaVencimiento: "2026-03-31" },
];

const DOCS: Doc[] = [
  { id: "D1", proyecto: "Campaña Cerveza X", cliente: "Bavaria", tipo: "NDA", fecha: "2026-04-01", estado: "Firmado" },
  { id: "D2", proyecto: "Campaña Cerveza X", cliente: "Bavaria", tipo: "Contrato", fecha: "2026-04-03", estado: "Firmado" },
  { id: "D3", proyecto: "Film Publicitario", cliente: "Avianca", tipo: "Derechos de Imagen", fecha: "2026-04-10", estado: "Pendiente" },
  { id: "D4", proyecto: "Film Publicitario", cliente: "Avianca", tipo: "NDA", fecha: "2026-04-08", estado: "Firmado" },
  { id: "D5", proyecto: "Video Corporativo Z", cliente: "Bancolombia", tipo: "Contrato", fecha: "2026-04-18", estado: "Revisión" },
  { id: "D6", proyecto: "TVC Navidad", cliente: "Éxito", tipo: "Presupuesto", fecha: "2026-02-28", estado: "Firmado" },
];

const DEFAULT_ITEMS: BudgetItem[] = [
  { categoria: "Cámara", descripcion: "RED Komodo 6K + Lentes", qty: 1, dias: 2, tarifa: 800 },
  { categoria: "Cámara", descripcion: "DJI Ronin 4D (2nd cam)", qty: 1, dias: 2, tarifa: 400 },
  { categoria: "Crew", descripcion: "Director de Fotografía", qty: 1, dias: 2, tarifa: 600 },
  { categoria: "Crew", descripcion: "Director de Arte", qty: 1, dias: 2, tarifa: 450 },
  { categoria: "Crew", descripcion: "Gaffer + Kit Luz", qty: 1, dias: 2, tarifa: 350 },
  { categoria: "Crew", descripcion: "Asistente de Cámara", qty: 1, dias: 2, tarifa: 200 },
  { categoria: "Edición", descripcion: "Editor Principal", qty: 1, dias: 5, tarifa: 300 },
  { categoria: "Edición", descripcion: "Colorista", qty: 1, dias: 2, tarifa: 400 },
  { categoria: "Edición", descripcion: "Diseñador de Sonido", qty: 1, dias: 2, tarifa: 250 },
];

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  Pagada: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  Parcial: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  Pendiente: "bg-[#ffffff15] text-[#FAFAFA] border-[#ffffff30]",
  Mora: "bg-[#ff444420] text-[#ff4444] border-[#ff444440]",
};

const DOC_STYLE: Record<string, string> = {
  Firmado: "bg-[#22c55e20] text-[#22c55e] border-[#22c55e40]",
  Pendiente: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  Revisión: "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
};

export default function FinancePage() {
  const [tab, setTab] = useState<"facturacion" | "presupuesto" | "legal">("facturacion");
  const [items, setItems] = useState<BudgetItem[]>(DEFAULT_ITEMS);

  const total = INVOICES.reduce((s, i) => s + i.monto, 0);
  const cobrado = INVOICES.reduce((s, i) => s + i.pagado, 0);
  const pendiente = total - cobrado;
  const mora = INVOICES.filter((i) => i.status === "Mora").reduce((s, i) => s + (i.monto - i.pagado), 0);

  const budgetTotal = items.reduce((s, i) => s + i.qty * i.dias * i.tarifa, 0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { l: "Total Facturado", v: fmt(total), c: false },
          { l: "Cobrado", v: fmt(cobrado), c: false },
          { l: "Por Cobrar", v: fmt(pendiente), c: true },
          { l: "En Mora", v: fmt(mora), c: false, red: mora > 0 },
        ].map((k) => (
          <div key={k.l} className={`rounded-xl p-5 border ${k.c ? "bg-[#F5C200] border-[#F5C200]" : k.red ? "bg-[#ff444410] border-[#ff444430]" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
            <p className={`text-xs uppercase tracking-widest mb-2 ${k.c ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>{k.l}</p>
            <p className={`text-xl font-bold ${k.c ? "text-[#0a0a0a]" : k.red ? "text-[#ff4444]" : "text-[#FAFAFA]"}`}>{k.v}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: "facturacion" as const, label: "Facturación" },
          { id: "presupuesto" as const, label: "Generador de Presupuesto" },
          { id: "legal" as const, label: "Repositorio Legal" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              tab === t.id ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]" : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Facturación */}
      {tab === "facturacion" && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#2a2a2a]">
                <tr>
                  {["#", "Proyecto", "Cliente", "Total", "Pagado", "Pendiente", "Status", "Vencimiento"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id} className={`border-b border-[#1f1f1f] hover:bg-[#2a2a2a20] transition-colors ${inv.status === "Mora" ? "bg-[#ff444408]" : ""}`}>
                    <td className="py-3 px-4 text-[#6b6b6b] font-mono text-xs">{inv.id}</td>
                    <td className="py-3 px-4 text-[#FAFAFA] font-medium">{inv.proyecto}</td>
                    <td className="py-3 px-4 text-[#6b6b6b]">{inv.cliente}</td>
                    <td className="py-3 px-4 text-[#FAFAFA]">{fmt(inv.monto)}</td>
                    <td className="py-3 px-4 text-[#22c55e]">{fmt(inv.pagado)}</td>
                    <td className="py-3 px-4 text-[#F5C200] font-medium">{fmt(inv.monto - inv.pagado)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLE[inv.status]}`}>{inv.status}</span>
                    </td>
                    <td className={`py-3 px-4 text-xs font-medium ${inv.status === "Mora" ? "text-[#ff4444]" : "text-[#6b6b6b]"}`}>
                      {inv.fechaVencimiento}
                      {inv.status === "Mora" && <span className="ml-1">⚠</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Presupuesto */}
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
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, qty: +e.target.value } : it))}
                        className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={item.dias}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, dias: +e.target.value } : it))}
                        className="w-14 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={item.tarifa}
                        onChange={(e) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, tarifa: +e.target.value } : it))}
                        className="w-20 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-2 py-1 text-[#FAFAFA] text-xs text-center focus:outline-none focus:border-[#F5C200]"
                      />
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

      {/* Legal */}
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

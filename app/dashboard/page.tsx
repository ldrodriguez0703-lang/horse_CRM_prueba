import { fetchSheetsData } from "@/lib/sheets";
import { fetchProyectos, getPhase } from "@/lib/airtable";
import SalesChart from "@/components/SalesChart";
import MonthlyDonut from "@/components/MonthlyDonut";
import VendedorChart from "@/components/VendedorChart";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function KPI({ label, value, sub, accent, warn }: {
  label: string; value: string; sub?: string; accent?: boolean; warn?: boolean;
}) {
  const bg = accent ? "bg-[#F5C200] border-[#F5C200]"
           : warn   ? "bg-[#ff444410] border-[#ff444430]"
                    : "bg-[#1a1a1a] border-[#2a2a2a]";
  const titleClr = accent ? "text-[#0a0a0a80]" : "text-[#6b6b6b]";
  const valClr   = accent ? "text-[#0a0a0a]" : warn ? "text-[#ff6b6b]" : "text-[#FAFAFA]";
  return (
    <div className={`rounded-xl p-5 border ${bg}`}>
      <p className={`text-xs font-medium tracking-widest uppercase mb-2 ${titleClr}`}>{label}</p>
      <p className={`text-2xl font-bold ${valClr}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-[#0a0a0a70]" : "text-[#6b6b6b]"}`}>{sub}</p>}
    </div>
  );
}


export default async function DashboardPage() {
  const [d, proyectos] = await Promise.all([fetchSheetsData(), fetchProyectos()]);

  // Most-recent-first for all charts/tables
  const monthlyDesc = [...d.monthlyStats].reverse();
  const vendedorDesc = [...d.vendedorData].reverse();

  const chartData = monthlyDesc.map((m) => ({
    mes: m.mes,
    confirmado: m.confirmadas,
    enCurso: m.deals,
    meta: m.meta,
  }));

  // KPI global (still most-recent = last in ascending original)
  const currentMonth = d.monthlyStats.at(-1);
  const pctActual = currentMonth?.pct ?? 0;

  return (
    <div className="space-y-6">

      {/* ── KPIs superiores ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Confirmadas (total)" value={fmt(d.totalConfirmado)}
             sub={`Meta mes: ${fmt(d.metaMensual)}`} accent />
        <KPI label="Deals activos"       value={fmt(d.totalDeals)}
             sub={`${d.ventas.filter((v) => v.estado === "Deal").length} oportunidades`} />
        <KPI label="Cuentas por Cobrar"  value={fmt(d.totalPendienteCobro)}
             sub={`${d.arRows.length} facturas pendientes`} />
        <KPI label="GAP mes actual"      value={fmt(d.gap)}
             sub={`${pctActual}% completado`} warn={d.gap > 0} />
      </div>

      {/* ── Tabla resumen mensual ── */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left py-3 px-4 text-xs text-[#6b6b6b] font-medium tracking-widest uppercase w-44">
                Indicador
              </th>
              {monthlyDesc.map((m) => (
                <th key={m.mesKey} className="text-right py-3 px-4 text-xs text-[#F5C200] font-semibold tracking-wide uppercase">
                  {m.mes}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { key: "meta",          label: "Meta Mensual",          cls: "text-[#6b6b6b]" },
              { key: "confirmadas",   label: "Ventas Confirmadas",    cls: "text-[#F5C200] font-semibold" },
              { key: "deals",         label: "Deals (No Confirmados)", cls: "text-[#4a9eff]" },
              { key: "totalPotencial",label: "Total Potencial",        cls: "text-[#FAFAFA] font-medium" },
              { key: "pct",           label: "% Cumplimiento",         cls: "text-[#22c55e] font-bold", isPct: true },
              { key: "alcanzado",     label: "Alcanzado",              cls: "text-[#FAFAFA]" },
              { key: "restante",      label: "Restante",               cls: "text-[#ff6b6b]" },
            ].map(({ key, label, cls, isPct }) => (
              <tr key={key} className="border-b border-[#1f1f1f] hover:bg-[#2a2a2a20]">
                <td className="py-2.5 px-4 text-xs text-[#6b6b6b] font-medium">{label}</td>
                {monthlyDesc.map((m) => {
                  const raw = m[key as keyof typeof m] as number;
                  return (
                    <td key={m.mesKey} className={`py-2.5 px-4 text-right text-sm ${cls}`}>
                      {isPct ? `${raw}%` : fmt(raw)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* ── Barras de progreso por mes ── */}
        <div className="grid border-t border-[#2a2a2a]"
          style={{ gridTemplateColumns: `11rem repeat(${monthlyDesc.length}, 1fr)` }}>
          <div className="py-3 px-4" />
          {monthlyDesc.map((m) => {
            const w = Math.min(100, m.pct);
            const color = m.pct >= 100 ? "#22c55e" : m.pct >= 75 ? "#F5C200" : "#f97316";
            return (
              <div key={m.mesKey} className="py-3 px-4 flex items-center">
                <div className="h-2.5 flex-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${w}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Ventas por vendedor ── */}
      {d.vendedores.length > 0 && (
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-sm font-medium text-[#FAFAFA] mb-4">Confirmadas por Vendedor</p>
          <VendedorChart data={vendedorDesc} vendedores={d.vendedores} />
        </div>
      )}

      {/* ── Donuts por mes ── */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
        <p className="text-sm font-medium text-[#FAFAFA] mb-5">
          Cumplimiento mensual — Meta {fmt(d.metaMensual)}
        </p>
        <div className="flex flex-wrap gap-8 justify-start">
          {monthlyDesc.map((m) => (
            <MonthlyDonut
              key={m.mesKey}
              mes={m.mes}
              pct={m.pct}
              confirmadas={m.confirmadas}
              restante={m.restante}
              meta={m.meta}
            />
          ))}
        </div>
      </div>

      {/* ── Gráfico de barras + Pipeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-sm font-medium text-[#FAFAFA] mb-4">Confirmadas vs Deals por Mes</p>
          <SalesChart data={chartData} />
        </div>

        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-sm font-medium text-[#FAFAFA] mb-4">Pipeline Activo</p>
          <div className="space-y-2">
            {proyectos
              .filter((p) => p.estadoNorm !== "cancelado" && p.estadoNorm !== "aun_no")
              .slice(0, 7)
              .map((p) => {
                const fase = getPhase(p.porcentaje);
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
                    <div className="flex-1 min-w-0 mr-3">
                      <p className="text-sm text-[#FAFAFA] font-medium truncate">{p.cliente}</p>
                      <p className="text-xs text-[#6b6b6b] truncate">{p.proyecto || p.nombre}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
                        style={{ background: `${fase.color}15`, color: fase.color, borderColor: `${fase.color}40` }}>
                        {fase.label}
                      </span>
                      <span className="text-xs text-[#6b6b6b]">{p.porcentaje}%</span>
                      {p.totalAcordado > 0 && (
                        <span className="text-sm font-semibold text-[#F5C200]">{fmt(p.totalAcordado)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* ── Cuentas por Cobrar (solo checkbox marcado) ── */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[#FAFAFA]">Cuentas por Cobrar</p>
          <span className="text-[#F5C200] font-bold text-sm">
            Total: {fmt(d.totalPendienteCobro)}
          </span>
        </div>
        {d.arRows.length === 0 ? (
          <p className="text-[#6b6b6b] text-sm">Sin cuentas pendientes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2a2a]">
                  {["#", "Fecha", "Cliente", "Vendedor", "Presupuesto", "Pendiente"].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-[#6b6b6b] font-medium tracking-widest uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.arRows.map((v, i) => (
                  <tr key={i} className="border-b border-[#1f1f1f] hover:bg-[#2a2a2a20]">
                    <td className="py-2.5 px-3 text-[#6b6b6b] font-mono text-xs">{v.id}</td>
                    <td className="py-2.5 px-3 text-[#6b6b6b] text-xs">{v.fecha}</td>
                    <td className="py-2.5 px-3 text-[#FAFAFA] font-medium">{v.cliente}</td>
                    <td className="py-2.5 px-3 text-[#6b6b6b]">{v.vendedor || "—"}</td>
                    <td className="py-2.5 px-3 text-[#FAFAFA]">{v.montoDisplay || fmt(v.valor)}</td>
                    <td className="py-2.5 px-3 text-[#F5C200] font-semibold">{fmt(v.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

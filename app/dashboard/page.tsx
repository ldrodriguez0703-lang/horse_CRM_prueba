import { fetchSheetsData } from "@/lib/sheets";
import SalesChart from "@/components/SalesChart";

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? "bg-[#F5C200] border-[#F5C200]" : "bg-[#1a1a1a] border-[#2a2a2a]"}`}>
      <p className={`text-xs font-medium tracking-widest uppercase mb-2 ${accent ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-[#0a0a0a]" : "text-[#FAFAFA]"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-[#0a0a0a80]" : "text-[#6b6b6b]"}`}>{sub}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  Confirmada: "bg-[#F5C20020] text-[#F5C200] border border-[#F5C20040]",
  "En Curso":  "bg-[#1a4a8020] text-[#4a9eff] border border-[#4a9eff40]",
  Pendiente:  "bg-[#ffffff10] text-[#6b6b6b] border border-[#6b6b6b30]",
  Rechazada:  "bg-[#ff444420] text-[#ff4444] border border-[#ff444440]",
};

// Normaliza el campo Mes para ordenar cronológicamente
function mesToSort(mes: string): string {
  const meses: Record<string, string> = {
    ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
    jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
  };
  const lower = mes.toLowerCase();
  for (const [k, v] of Object.entries(meses)) {
    if (lower.includes(k)) {
      const year = mes.match(/\d{4}/)?.[0] ?? "2026";
      return `${year}-${v}`;
    }
  }
  // Si ya viene en formato YYYY-MM o similar
  return mes;
}

export default async function DashboardPage() {
  const data = await fetchSheetsData();

  // Agrupar por mes para el gráfico
  const byMonth: Record<string, { confirmado: number; enCurso: number; label: string }> = {};
  data.ventas.forEach((v) => {
    if (!v.mes) return;
    const key = mesToSort(v.mes);
    if (!byMonth[key]) byMonth[key] = { confirmado: 0, enCurso: 0, label: v.mes };
    if (v.estado === "Confirmada") byMonth[key].confirmado += v.valor;
    if (v.estado === "En Curso")   byMonth[key].enCurso   += v.valor;
  });

  const chartData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, vals]) => ({
      mes: vals.label,
      confirmado: vals.confirmado,
      enCurso: vals.enCurso,
      meta: data.metaMensual,
    }));

  const pct = Math.min(100, Math.round((data.totalConfirmado / data.metaMensual) * 100));
  const mesActual = new Date().toLocaleString("es-CO", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Ventas Confirmadas"  value={fmt(data.totalConfirmado)}     sub={`${pct}% de la meta`}                                              accent />
        <KPI label="Deals en Curso"      value={fmt(data.totalEnCurso)}        sub={`${data.ventas.filter((v) => v.estado === "En Curso").length} proyectos`} />
        <KPI label="Cuentas por Cobrar"  value={fmt(data.totalPendienteCobro)} sub="AR total" />
        <KPI label="GAP a Meta"          value={fmt(data.gap)}                 sub={`Meta: ${fmt(data.metaMensual)}`} />
      </div>

      {/* Barra de progreso meta mensual */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-[#FAFAFA] capitalize">Meta Mensual — {mesActual}</p>
          <p className="text-sm text-[#F5C200] font-semibold">{pct}%</p>
        </div>
        <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div className="h-full bg-[#F5C200] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[#6b6b6b]">
          <span>Confirmado: {fmt(data.totalConfirmado)}</span>
          <span>Meta: {fmt(data.metaMensual)}</span>
        </div>
      </div>

      {/* Gráfico + Pipeline activo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-sm font-medium text-[#FAFAFA] mb-4">Ventas por Mes</p>
          <SalesChart data={chartData} />
        </div>

        <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
          <p className="text-sm font-medium text-[#FAFAFA] mb-4">Pipeline Activo</p>
          <div className="space-y-2">
            {data.ventas
              .filter((v) => v.estado !== "Rechazada")
              .slice(0, 6)
              .map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm text-[#FAFAFA] font-medium truncate">{v.cliente}</p>
                    <p className="text-xs text-[#6b6b6b]">{v.vendedor} · {v.mes}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[v.estado]}`}>
                      {v.estado}
                    </span>
                    <span className="text-sm font-semibold text-[#F5C200]">{fmt(v.valor)}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Tabla AR completa */}
      <div className="bg-[#1a1a1a] rounded-xl border border-[#2a2a2a] p-5">
        <p className="text-sm font-medium text-[#FAFAFA] mb-4">Cuentas por Cobrar (AR)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                {["Cliente", "Vendedor", "Mes", "Monto", "Cobrado", "Por Cobrar", "Estado"].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-[#6b6b6b] font-medium tracking-wide uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.ventas.map((v, i) => (
                <tr key={i} className="border-b border-[#1f1f1f] hover:bg-[#2a2a2a20] transition-colors">
                  <td className="py-2.5 px-3 text-[#FAFAFA] font-medium">{v.cliente}</td>
                  <td className="py-2.5 px-3 text-[#6b6b6b]">{v.vendedor || "—"}</td>
                  <td className="py-2.5 px-3 text-[#6b6b6b] text-xs">{v.mes}</td>
                  <td className="py-2.5 px-3 text-[#FAFAFA]">{v.montoDisplay || fmt(v.valor)}</td>
                  <td className="py-2.5 px-3 text-green-400">{fmt(v.cobrado)}</td>
                  <td className="py-2.5 px-3 text-[#F5C200] font-medium">{v.pendiente > 0 ? fmt(v.pendiente) : "—"}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[v.estado]}`}>
                      {v.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

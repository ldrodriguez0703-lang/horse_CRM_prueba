// Google Sheets — Horse In Motion
// Columns: Column7(skip) | Fecha | Mes | Cliente | Estado | Monto | Vendedor | Monto_num | Por Cobrar(checkbox)

export interface SalesRow {
  id: string;
  cliente: string;
  estado: "Confirmada" | "Deal" | "Muerto";
  valor: number;
  montoDisplay: string;
  porCobrar: boolean;
  fecha: string;
  mes: string;
  vendedor: string;
}

export interface MonthlyStats {
  mes: string;
  mesKey: string;
  meta: number;
  confirmadas: number;
  deals: number;
  totalPotencial: number;
  pct: number;
  alcanzado: number;
  restante: number;
}

export interface VendedorMonthData {
  mes: string;
  mesKey: string;
  totales: Record<string, number>;
}

export interface DashboardData {
  ventas: SalesRow[];
  arRows: SalesRow[];
  monthlyStats: MonthlyStats[];
  vendedorData: VendedorMonthData[];
  vendedores: string[];
  metaMensual: number;
  totalConfirmado: number;
  totalDeals: number;
  totalPendienteCobro: number;
  gap: number;
}

const SHEET_ID = "1nSadqpqMIXQA5kIXi979_4SYgiQNdgzo";
const GID = "901453185";
const META = 10000;

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function normalizeEstado(raw: string): SalesRow["estado"] {
  const v = norm(raw);
  if (v.includes("confirm")) return "Confirmada";
  if (v.includes("muerto") || v.includes("cancel") || v.includes("rechazo") || v.includes("perdido")) return "Muerto";
  return "Deal";
}

function parseNum(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseBool(s: string): boolean {
  const v = s.toLowerCase().trim();
  return v === "true" || v === "verdadero" || v === "1" || v === "yes" || v === "sí" || v === "si";
}

// Ordena meses en español cronológicamente
const MES_ORDER: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function mesToKey(mes: string): string {
  const lower = norm(mes);
  for (const [k, v] of Object.entries(MES_ORDER)) {
    if (lower.includes(k)) {
      const year = mes.match(/\d{4}/)?.[0] ?? mes.match(/\d{2}/)?.[0] ?? "26";
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${String(v).padStart(2, "0")}`;
    }
  }
  return mes;
}

export async function fetchSheetsData(): Promise<DashboardData> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`${res.status}`);
    return processCSV(await res.text());
  } catch {
    return buildResult(getMockRows());
  }
}

// Parser CSV que respeta comas dentro de comillas: "1,769.91" no se parte
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function processCSV(csv: string): DashboardData {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return buildResult(getMockRows());

  const headers = parseCSVLine(lines[0]).map((h) => norm(h));
  const col = (name: string) => headers.findIndex((h) => h.includes(norm(name)));

  const iId        = col("column 7") !== -1 ? col("column 7") : 0;
  const iCliente   = col("cliente");
  const iEstado    = col("estado");
  const iMontoNum  = col("monto_num") !== -1 ? col("monto_num") : col("monto");
  const iMontoDisp = col("monto") !== -1 && col("monto") !== iMontoNum ? col("monto") : -1;
  const iPorCobrar = col("por cobrar") !== -1 ? col("por cobrar") : col("cobrar");
  const iFecha     = col("fecha");
  const iMes       = col("mes");
  const iVendedor  = col("vendedor");

  const rows: SalesRow[] = lines
    .slice(1)
    .map((line): SalesRow | null => {
      const c = parseCSVLine(line);
      const cliente = iCliente !== -1 ? c[iCliente] : "";
      if (!cliente) return null;
      return {
        id:          iId !== -1 ? c[iId] : "",
        cliente,
        estado:      normalizeEstado(iEstado !== -1 ? c[iEstado] : ""),
        valor:       iMontoNum !== -1 ? parseNum(c[iMontoNum]) : 0,
        montoDisplay: iMontoDisp !== -1 ? c[iMontoDisp] : "",
        porCobrar:   iPorCobrar !== -1 ? parseBool(c[iPorCobrar]) : false,
        fecha:       iFecha !== -1 ? c[iFecha] : "",
        mes:         iMes !== -1 ? c[iMes] : "",
        vendedor:    iVendedor !== -1 ? c[iVendedor] : "",
      };
    })
    .filter(Boolean) as SalesRow[];

  return buildResult(rows);
}

function buildResult(ventas: SalesRow[]): DashboardData {
  // AR: solo los que tienen Por Cobrar = true (checkbox marcado)
  const arRows = ventas.filter((v) => v.porCobrar);

  // Agrupar por mes para estadísticas mensuales
  const byMes: Record<string, { mes: string; confirmadas: number; deals: number }> = {};
  ventas.forEach((v) => {
    if (!v.mes || v.estado === "Muerto") return;
    const key = mesToKey(v.mes);
    if (!byMes[key]) byMes[key] = { mes: v.mes, confirmadas: 0, deals: 0 };
    if (v.estado === "Confirmada") byMes[key].confirmadas += v.valor;
    if (v.estado === "Deal")       byMes[key].deals       += v.valor;
  });

  const monthlyStats: MonthlyStats[] = Object.entries(byMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, d]): MonthlyStats => {
      const alcanzado     = d.confirmadas;
      const totalPotencial = d.confirmadas + d.deals;
      const pct           = META > 0 ? Math.round((alcanzado / META) * 100) : 0;
      const restante      = Math.max(0, META - alcanzado);
      return {
        mes: d.mes,
        mesKey: key,
        meta: META,
        confirmadas: d.confirmadas,
        deals: d.deals,
        totalPotencial,
        pct,
        alcanzado,
        restante,
      };
    });

  // Vendedor aggregation: only Confirmadas, grouped by (mesKey, vendedor)
  const vendorByMonth: Record<string, Record<string, number>> = {};
  const allVendors = new Set<string>();
  ventas.forEach((v) => {
    if (!v.mes || v.estado !== "Confirmada" || !v.vendedor) return;
    const key = mesToKey(v.mes);
    const name = v.vendedor.trim();
    allVendors.add(name);
    if (!vendorByMonth[key]) vendorByMonth[key] = {};
    vendorByMonth[key][name] = (vendorByMonth[key][name] ?? 0) + v.valor;
  });
  const vendedores = [...allVendors].sort();
  const vendedorData: VendedorMonthData[] = monthlyStats.map((m) => ({
    mes: m.mes,
    mesKey: m.mesKey,
    totales: Object.fromEntries(vendedores.map((v) => [v, vendorByMonth[m.mesKey]?.[v] ?? 0])),
  }));

  const totalConfirmado     = ventas.filter((v) => v.estado === "Confirmada").reduce((s, v) => s + v.valor, 0);
  const totalDeals          = ventas.filter((v) => v.estado === "Deal").reduce((s, v) => s + v.valor, 0);
  const totalPendienteCobro = arRows.reduce((s, v) => s + v.valor, 0);

  return {
    ventas,
    arRows,
    monthlyStats,
    vendedorData,
    vendedores,
    metaMensual: META,
    totalConfirmado,
    totalDeals,
    totalPendienteCobro,
    gap: Math.max(0, META - (monthlyStats.at(-1)?.confirmadas ?? 0)),
  };
}

function getMockRows(): SalesRow[] {
  return [
    { id: "V00001", cliente: "Dual",         estado: "Confirmada", valor: 1769.91,  montoDisplay: "$1,769.91",  porCobrar: false, fecha: "1/4/26",  mes: "Enero",   vendedor: "Jesus"      },
    { id: "V00002", cliente: "Gigante",       estado: "Deal",       valor: 10000,    montoDisplay: "$10,000.00", porCobrar: false, fecha: "1/5/26",  mes: "Enero",   vendedor: "Alejandro"  },
    { id: "V00003", cliente: "Bodas",         estado: "Confirmada", valor: 1000,     montoDisplay: "$1,000.00",  porCobrar: false, fecha: "1/6/26",  mes: "Enero",   vendedor: "Jesus"      },
    { id: "V00008", cliente: "Innovablends",  estado: "Deal",       valor: 11000,    montoDisplay: "$11,000.00", porCobrar: false, fecha: "1/21/26", mes: "Enero",   vendedor: "Jesus"      },
    { id: "V00009", cliente: "ST Costa Rica", estado: "Muerto",     valor: 7000,     montoDisplay: "$7,000.00",  porCobrar: false, fecha: "1/22/26", mes: "Enero",   vendedor: "Jesus"      },
    { id: "V00015", cliente: "Dual",          estado: "Confirmada", valor: 1769.91,  montoDisplay: "$1,769.91",  porCobrar: false, fecha: "2/9/26",  mes: "Febrero", vendedor: "Jesus"      },
    { id: "V00016", cliente: "Scouts CR",     estado: "Deal",       valor: 14000,    montoDisplay: "$14,000.00", porCobrar: false, fecha: "2/10/26", mes: "Febrero", vendedor: "Jesus"      },
    { id: "V00017", cliente: "RC Inmobiliaria",estado: "Muerto",    valor: 5000,     montoDisplay: "$5,000.00",  porCobrar: false, fecha: "2/10/26", mes: "Febrero", vendedor: "Luis Diego" },
    { id: "V00023", cliente: "Joven Salud",   estado: "Confirmada", valor: 200,      montoDisplay: "$200.00",    porCobrar: true,  fecha: "2/24/26", mes: "Febrero", vendedor: "Diego"      },
    { id: "V00024", cliente: "Dual",          estado: "Confirmada", valor: 1769.91,  montoDisplay: "$1,769.91",  porCobrar: false, fecha: "3/1/26",  mes: "Marzo",   vendedor: "Jesus"      },
    { id: "V00025", cliente: "Sondel",        estado: "Confirmada", valor: 1000,     montoDisplay: "$1,000.00",  porCobrar: false, fecha: "3/2/26",  mes: "Marzo",   vendedor: "Jesus"      },
  ];
}

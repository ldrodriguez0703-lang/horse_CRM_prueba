// Google Sheets data fetcher — Horse In Motion
// Sheet ID: 1nSadqpqMIXQA5kIXi979_4SYgiQNdgzo  Tab: gid=901453185
// Columns: Column7(skip) | Fecha | Mes | Cliente | Estado | Monto | Vendedor | Monto_num | Por Cobrar

export interface SalesRow {
  cliente: string;
  estado: "Confirmada" | "En Curso" | "Pendiente" | "Rechazada";
  valor: number;
  cobrado: number;
  pendiente: number;
  fecha: string;
  mes: string;
  vendedor: string;
  montoDisplay: string;
}

export interface DashboardData {
  ventas: SalesRow[];
  metaMensual: number;
  totalConfirmado: number;
  totalEnCurso: number;
  totalPendienteCobro: number;
  gap: number;
}

const SHEET_ID = "1nSadqpqMIXQA5kIXi979_4SYgiQNdgzo";
const GID = "901453185";

// Normaliza variantes del campo Estado al enum esperado
function normalizeEstado(raw: string): SalesRow["estado"] {
  const v = raw.trim().toLowerCase();
  if (v.includes("confirm")) return "Confirmada";
  if (v.includes("curso") || v.includes("negoc") || v.includes("proceso")) return "En Curso";
  if (v.includes("rechazo") || v.includes("rechaz") || v.includes("cancel")) return "Rechazada";
  return "Pendiente";
}

function parseNum(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function fetchSheetsData(): Promise<DashboardData> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) throw new Error(`Sheets ${res.status}`);

    const csv = await res.text();
    return processCSV(csv);
  } catch {
    return getMockData();
  }
}

function processCSV(csv: string): DashboardData {
  const lines = csv.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return getMockData();

  // Mapear headers dinámicamente (case-insensitive, sin tildes)
  const normalize = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const headers = lines[0].split(",").map((h) => normalize(h.replace(/^"|"$/g, "")));

  const idx = (name: string) => headers.findIndex((h) => h.includes(normalize(name)));

  const iCliente   = idx("cliente");
  const iEstado    = idx("estado");
  const iMonto     = idx("monto_num") !== -1 ? idx("monto_num") : idx("monto");
  const iMontoDisp = idx("monto") !== -1 && idx("monto") !== iMonto ? idx("monto") : -1;
  const iPorCobrar = idx("por cobrar") !== -1 ? idx("por cobrar") : idx("cobrar");
  const iFecha     = idx("fecha");
  const iMes       = idx("mes");
  const iVendedor  = idx("vendedor");

  const data: SalesRow[] = lines
    .slice(1)
    .map((line) => {
      const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
      const cliente = iCliente !== -1 ? cols[iCliente] : "";
      if (!cliente) return null;

      const montoNum   = iMonto !== -1 ? parseNum(cols[iMonto]) : 0;
      const porCobrar  = iPorCobrar !== -1 ? parseNum(cols[iPorCobrar]) : 0;
      const cobrado    = montoNum - porCobrar;

      return {
        cliente,
        estado:       normalizeEstado(iEstado !== -1 ? cols[iEstado] : ""),
        valor:        montoNum,
        cobrado:      Math.max(0, cobrado),
        pendiente:    porCobrar,
        fecha:        iFecha !== -1 ? cols[iFecha] : "",
        mes:          iMes !== -1 ? cols[iMes] : "",
        vendedor:     iVendedor !== -1 ? cols[iVendedor] : "",
        montoDisplay: iMontoDisp !== -1 ? cols[iMontoDisp] : "",
      } as SalesRow;
    })
    .filter(Boolean) as SalesRow[];

  return buildResult(data);
}

function buildResult(ventas: SalesRow[]): DashboardData {
  const metaMensual       = 50000;
  const totalConfirmado   = ventas.filter((v) => v.estado === "Confirmada").reduce((s, v) => s + v.valor, 0);
  const totalEnCurso      = ventas.filter((v) => v.estado === "En Curso").reduce((s, v) => s + v.valor, 0);
  const totalPendienteCobro = ventas.reduce((s, v) => s + v.pendiente, 0);

  return {
    ventas,
    metaMensual,
    totalConfirmado,
    totalEnCurso,
    totalPendienteCobro,
    gap: Math.max(0, metaMensual - totalConfirmado),
  };
}

function getMockData(): DashboardData {
  const ventas: SalesRow[] = [
    { cliente: "Bavaria",     estado: "Confirmada", valor: 18500, cobrado: 9250,  pendiente: 9250,  fecha: "2026-04-05", mes: "Abr 2026", vendedor: "Luis", montoDisplay: "$18,500" },
    { cliente: "Claro",       estado: "Confirmada", valor: 12000, cobrado: 12000, pendiente: 0,     fecha: "2026-04-10", mes: "Abr 2026", vendedor: "Luis", montoDisplay: "$12,000" },
    { cliente: "Bancolombia", estado: "En Curso",   valor: 8000,  cobrado: 0,     pendiente: 8000,  fecha: "2026-04-18", mes: "Abr 2026", vendedor: "Luis", montoDisplay: "$8,000"  },
    { cliente: "Éxito",       estado: "En Curso",   valor: 25000, cobrado: 0,     pendiente: 25000, fecha: "2026-04-20", mes: "Abr 2026", vendedor: "Luis", montoDisplay: "$25,000" },
    { cliente: "Rappi",       estado: "Pendiente",  valor: 4500,  cobrado: 0,     pendiente: 4500,  fecha: "2026-05-01", mes: "May 2026", vendedor: "Luis", montoDisplay: "$4,500"  },
    { cliente: "Movistar",    estado: "Rechazada",  valor: 6000,  cobrado: 0,     pendiente: 0,     fecha: "2026-03-15", mes: "Mar 2026", vendedor: "Luis", montoDisplay: "$6,000"  },
    { cliente: "Samsung",     estado: "Confirmada", valor: 15000, cobrado: 15000, pendiente: 0,     fecha: "2026-03-20", mes: "Mar 2026", vendedor: "Luis", montoDisplay: "$15,000" },
    { cliente: "Avianca",     estado: "En Curso",   valor: 35000, cobrado: 17500, pendiente: 17500, fecha: "2026-04-25", mes: "Abr 2026", vendedor: "Luis", montoDisplay: "$35,000" },
  ];
  return buildResult(ventas);
}

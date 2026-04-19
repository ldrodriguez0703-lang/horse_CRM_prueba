// Google Sheets data fetcher for Horse In Motion Dashboard
// Sheet ID: 1nSadqpqMIXQA5kIXi979_4SYgiQNdgzo  Tab: gid=901453185

export interface SalesRow {
  proyecto: string;
  cliente: string;
  estado: "Confirmada" | "En Curso" | "Pendiente" | "Rechazada";
  valor: number;
  cobrado: number;
  pendiente: number;
  fecha: string;
  mes: string;
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

export async function fetchSheetsData(): Promise<DashboardData> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) throw new Error("Sheets fetch failed");

    const csv = await res.text();
    const rows = parseCSV(csv);

    return processRows(rows);
  } catch {
    return getMockData();
  }
}

function parseCSV(csv: string): string[][] {
  return csv
    .split("\n")
    .filter(Boolean)
    .map((line) =>
      line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim())
    );
}

function processRows(rows: string[][]): DashboardData {
  if (rows.length < 2) return getMockData();

  // Header: Proyecto | Cliente | Estado | Valor | Cobrado | Pendiente | Fecha
  const data = rows.slice(1).map((row): SalesRow => ({
    proyecto: row[0] || "",
    cliente: row[1] || "",
    estado: (row[2] as SalesRow["estado"]) || "Pendiente",
    valor: parseFloat(row[3]?.replace(/[^0-9.]/g, "") || "0"),
    cobrado: parseFloat(row[4]?.replace(/[^0-9.]/g, "") || "0"),
    pendiente: parseFloat(row[5]?.replace(/[^0-9.]/g, "") || "0"),
    fecha: row[6] || "",
    mes: row[6] ? row[6].substring(0, 7) : "",
  })).filter((r) => r.proyecto);

  const metaMensual = 50000;
  const totalConfirmado = data
    .filter((r) => r.estado === "Confirmada")
    .reduce((s, r) => s + r.valor, 0);
  const totalEnCurso = data
    .filter((r) => r.estado === "En Curso")
    .reduce((s, r) => s + r.valor, 0);
  const totalPendienteCobro = data.reduce((s, r) => s + r.pendiente, 0);

  return {
    ventas: data,
    metaMensual,
    totalConfirmado,
    totalEnCurso,
    totalPendienteCobro,
    gap: Math.max(0, metaMensual - totalConfirmado),
  };
}

function getMockData(): DashboardData {
  const ventas: SalesRow[] = [
    { proyecto: "Campaña Cerveza X", cliente: "Bavaria", estado: "Confirmada", valor: 18500, cobrado: 9250, pendiente: 9250, fecha: "2026-04-05", mes: "2026-04" },
    { proyecto: "Documental Marca Y", cliente: "Claro", estado: "Confirmada", valor: 12000, cobrado: 12000, pendiente: 0, fecha: "2026-04-10", mes: "2026-04" },
    { proyecto: "Video Corporativo Z", cliente: "Bancolombia", estado: "En Curso", valor: 8000, cobrado: 0, pendiente: 8000, fecha: "2026-04-18", mes: "2026-04" },
    { proyecto: "TVC Navidad", cliente: "Éxito", estado: "En Curso", valor: 25000, cobrado: 0, pendiente: 25000, fecha: "2026-04-20", mes: "2026-04" },
    { proyecto: "Reel RRSS", cliente: "Rappi", estado: "Pendiente", valor: 4500, cobrado: 0, pendiente: 4500, fecha: "2026-05-01", mes: "2026-05" },
    { proyecto: "Spot Radio + Video", cliente: "Movistar", estado: "Rechazada", valor: 6000, cobrado: 0, pendiente: 0, fecha: "2026-03-15", mes: "2026-03" },
    { proyecto: "Campaña Digital Q1", cliente: "Samsung", estado: "Confirmada", valor: 15000, cobrado: 15000, pendiente: 0, fecha: "2026-03-20", mes: "2026-03" },
    { proyecto: "Film Publicitario", cliente: "Avianca", estado: "En Curso", valor: 35000, cobrado: 17500, pendiente: 17500, fecha: "2026-04-25", mes: "2026-04" },
  ];

  const totalConfirmado = ventas.filter((v) => v.estado === "Confirmada").reduce((s, v) => s + v.valor, 0);
  const totalEnCurso = ventas.filter((v) => v.estado === "En Curso").reduce((s, v) => s + v.valor, 0);
  const totalPendienteCobro = ventas.reduce((s, v) => s + v.pendiente, 0);
  const metaMensual = 50000;

  return {
    ventas,
    metaMensual,
    totalConfirmado,
    totalEnCurso,
    totalPendienteCobro,
    gap: Math.max(0, metaMensual - totalConfirmado),
  };
}

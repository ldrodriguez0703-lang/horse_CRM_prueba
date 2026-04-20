// Airtable integration — Horse In Motion Proyectos
// Base: appKEdyjyWLAT7dHQ  Table: tblaWMR3gJbd2xnw4

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  type: string;
  thumbnails?: { small?: { url: string }; large?: { url: string } };
}

export interface Proyecto {
  id: string;
  nombre: string;
  estado: string;
  estadoNorm: "confirmado" | "en_curso" | "aun_no" | "cancelado" | "otro";
  totalAcordado: number;
  porcentaje: number;
  representante: string;
  fechaEntrega: string;
  fechaCreacion: string;
  descripcion: string;
  objetivo: string;
  proforma: string;
  presentacion: string;
  material: AirtableAttachment[];
  tareasCount: number;
}

const BASE    = process.env.AIRTABLE_BASE    ?? "appKEdyjyWLAT7dHQ";
const TABLE   = process.env.AIRTABLE_TABLE   ?? "tblaWMR3gJbd2xnw4";
const TOKEN   = process.env.AIRTABLE_TOKEN   ?? "";

function normalizeEstado(raw: string): Proyecto["estadoNorm"] {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("cancel")) return "cancelado";
  if (v.includes("confirm")) return "confirmado";
  if (v.includes("proceso") || v.includes("curso") || v.includes("progreso") || v.includes("activo")) return "en_curso";
  if (v.includes("aun") || v.includes("no") || v.includes("pendiente") || v.includes("prospecto")) return "aun_no";
  return "otro";
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export { fmt };

export async function fetchProyectos(): Promise<Proyecto[]> {
  if (!TOKEN) return [];

  const all: Proyecto[] = [];
  let offset: string | undefined;

  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE}/${TABLE}`);
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("sort[0][field]", "Fecha de creación");
      url.searchParams.set("sort[0][direction]", "desc");
      if (offset) url.searchParams.set("offset", offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${TOKEN}` },
        next: { revalidate: 300 },
      });

      if (!res.ok) throw new Error(`Airtable ${res.status}`);

      const json = await res.json();
      offset = json.offset;

      for (const rec of json.records ?? []) {
        const f = rec.fields ?? {};
        all.push({
          id:            rec.id,
          nombre:        f["PROYECTOS"]               ?? "",
          estado:        f["ESTADO"]                  ?? "—",
          estadoNorm:    normalizeEstado(f["ESTADO"]  ?? ""),
          totalAcordado: f["TOTAL ACORDADO"]          ?? 0,
          porcentaje:    f["Porcentaje"]              ?? 0,
          representante: Array.isArray(f["Representante"]) ? f["Representante"].join(", ") : (f["Representante"] ?? "—"),
          fechaEntrega:  f["Fecha de entrega"]        ?? "",
          fechaCreacion: f["Fecha de creación"]       ?? "",
          descripcion:   f["Descripción del proyecto"] ?? "",
          objetivo:      f["Objetivo | Entregables"]  ?? "",
          proforma:      f["PROFORMA"]                ?? "",
          presentacion:  f["PRESENTACIÓN"]            ?? "",
          material:      Array.isArray(f["Material adicional"]) ? f["Material adicional"] : [],
          tareasCount:   Array.isArray(f["Tareas"]) ? f["Tareas"].length : 0,
        });
      }
    } while (offset);

    return all.filter((p) => p.nombre);
  } catch (e) {
    console.error("Airtable fetch error:", e);
    return [];
  }
}

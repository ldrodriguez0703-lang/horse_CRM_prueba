// Airtable integration — Horse In Motion Proyectos

export interface AirtableAttachment {
  id: string; url: string; filename: string; type: string;
  thumbnails?: { small?: { url: string }; large?: { url: string } };
}

export interface Proyecto {
  id: string;
  nombre: string;       // raw "CLIENTE | Proyecto"
  cliente: string;      // parsed
  proyecto: string;     // parsed
  estado: string;
  estadoNorm: "confirmado" | "en_curso" | "aun_no" | "cancelado" | "finalizado" | "otro";
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
  encargado: string;
}

// ── Etapas del pipeline con porcentaje auto-asignado ─────────────────────────
export const PIPELINE_STAGES = [
  { fase: "Creatividad",    etapa: "Propuesta",        pct: 5   },
  { fase: "Creatividad",    etapa: "Seguimiento",       pct: 12  },
  { fase: "Creatividad",    etapa: "Confirmación",      pct: 20  },
  { fase: "Pre-Producción", etapa: "Guion",             pct: 28  },
  { fase: "Pre-Producción", etapa: "Casting",           pct: 33  },
  { fase: "Pre-Producción", etapa: "Locaciones",        pct: 38  },
  { fase: "Pre-Producción", etapa: "Permisos",          pct: 45  },
  { fase: "Producción",     etapa: "Preparación set",   pct: 53  },
  { fase: "Producción",     etapa: "Rodaje confirmado", pct: 58  },
  { fase: "Producción",     etapa: "Shoot day",         pct: 65  },
  { fase: "Producción",     etapa: "Wrap",              pct: 72  },
  { fase: "Post / Entrega", etapa: "Montaje offline",   pct: 78  },
  { fase: "Post / Entrega", etapa: "Edición",           pct: 83  },
  { fase: "Post / Entrega", etapa: "Colorización",      pct: 87  },
  { fase: "Post / Entrega", etapa: "Sonido",            pct: 91  },
  { fase: "Post / Entrega", etapa: "VFX",               pct: 95  },
  { fase: "Post / Entrega", etapa: "Entrega final",     pct: 97  },
  { fase: "Cerrado",        etapa: "Cerrado",           pct: 100 },
  { fase: "Cerrado",        etapa: "Muerto",            pct: 100 },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// ── Fases con rangos (para la barra visual) ───────────────────────────────────
export const PHASES = [
  { label: "Creatividad",    min: 0,  max: 24,  color: "#F5C200" },
  { label: "Pre-Producción", min: 25, max: 49,  color: "#4a9eff" },
  { label: "Producción",     min: 50, max: 74,  color: "#f97316" },
  { label: "Post / Entrega", min: 75, max: 99,  color: "#a855f7" },
  { label: "Cerrado",        min: 100,max: 100, color: "#22c55e" },
] as const;

export function getPhase(pct: number) {
  return PHASES.find((p) => pct >= p.min && pct <= p.max) ?? PHASES[0];
}

// ── Parsing del nombre "CLIENTE | Proyecto" ───────────────────────────────────
export function parseNombre(nombre: string): { cliente: string; proyecto: string } {
  if (nombre.includes(" | ")) {
    const [c, p] = nombre.split(" | ", 2);
    return { cliente: c.trim(), proyecto: p.trim() };
  }
  const dashIdx = nombre.indexOf(" - ");
  if (dashIdx > 0) {
    return { cliente: nombre.substring(0, dashIdx).trim(), proyecto: nombre.substring(dashIdx + 3).trim() };
  }
  return { cliente: nombre, proyecto: "" };
}

const BASE  = process.env.AIRTABLE_BASE  ?? "appKEdyjyWLAT7dHQ";
const TABLE = process.env.AIRTABLE_TABLE ?? "tblaWMR3gJbd2xnw4";
const TOKEN = process.env.AIRTABLE_TOKEN ?? "";

function normalizeEstado(raw: string): Proyecto["estadoNorm"] {
  const v = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (v.includes("cancel"))                                                         return "cancelado";
  if (v.includes("aprobado"))                                                       return "confirmado";
  if (v.includes("finaliz") || v.includes("entregado") || v.includes("complet") || v.includes("terminado")) return "finalizado";
  if (v.includes("confirm"))                                                        return "confirmado";
  if (v.includes("proceso") || v.includes("curso") || v.includes("progreso") || v.includes("activo")) return "en_curso";
  if (v.includes("aun") || v.includes("pendiente") || v.includes("prospecto"))     return "aun_no";
  return "otro";
}

export function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

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
        const nombre = f["PROYECTOS"] ?? "";
        const parsed = parseNombre(nombre);
        all.push({
          id:            rec.id,
          nombre,
          cliente:       parsed.cliente,
          proyecto:      parsed.proyecto,
          estado:        f["ESTADO"]                   ?? "—",
          estadoNorm:    normalizeEstado(f["ESTADO"]   ?? ""),
          totalAcordado: f["TOTAL ACORDADO"]           ?? 0,
          porcentaje:    f["Porcentaje"]               ?? 0,
          representante: Array.isArray(f["Representante"]) ? f["Representante"].join(", ") : (f["Representante"] ?? "—"),
          fechaEntrega:  f["Fecha de entrega"]         ?? "",
          fechaCreacion: f["Fecha de creación"]        ?? "",
          descripcion:   f["Descripción del proyecto"] ?? "",
          objetivo:      f["Objetivo | Entregables"]   ?? "",
          proforma:      f["PROFORMA"]                 ?? "",
          presentacion:  f["PRESENTACIÓN"]             ?? "",
          material:      Array.isArray(f["Material adicional"]) ? f["Material adicional"] : [],
          tareasCount:   Array.isArray(f["Tareas"]) ? f["Tareas"].length : 0,
          encargado:     f["Encargado"] ?? "",
        });
      }
    } while (offset);
    return all.filter((p) => p.nombre);
  } catch (e) {
    console.error("Airtable fetch error:", e);
    return [];
  }
}

export async function patchProyecto(recordId: string, fields: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}/${recordId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    return res.ok;
  } catch { return false; }
}

"use client";

import { useState } from "react";

type Pipeline = "Enviada" | "Negociando" | "Aprobada" | "Rechazada";

interface Client {
  id: number;
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  instagram: string;
  pipeline: Pipeline;
  notas: string;
  estetica: string;
  tonos: string;
  proyectos: number;
  valor: number;
}

const MOCK: Client[] = [
  { id: 1, nombre: "Carlos Reyes", empresa: "Bavaria", email: "creyes@bavaria.com", telefono: "+57 300 123 4567", instagram: "@bavaria_col", pipeline: "Aprobada", notas: "Prefiere color natural. Sin música electrónica.", estetica: "Cinematográfico, cálido", tonos: "Tierra, dorado", proyectos: 3, valor: 65000 },
  { id: 2, nombre: "Ana Torres", empresa: "Claro Colombia", email: "atorres@claro.com", telefono: "+57 310 987 6543", instagram: "@claro_co", pipeline: "Negociando", notas: "Siempre pide revisiones extras. Aprueba en 48h.", estetica: "Moderno, corporativo", tonos: "Azul, blanco", proyectos: 5, valor: 120000 },
  { id: 3, nombre: "Pedro Gómez", empresa: "Rappi", email: "pgomez@rappi.com", telefono: "+57 320 456 7890", instagram: "@rappi", pipeline: "Enviada", notas: "Muy enfocado en UGC y contenido rápido.", estetica: "Vibrante, urbano", tonos: "Naranja, blanco", proyectos: 2, valor: 18000 },
  { id: 4, nombre: "María López", empresa: "Bancolombia", email: "mlopez@bancolombia.com", telefono: "+57 315 654 3210", instagram: "@bancolombia", pipeline: "Aprobada", notas: "Proceso de aprobación legal lento (3 semanas).", estetica: "Sereno, confiable", tonos: "Amarillo, negro", proyectos: 4, valor: 95000 },
  { id: 5, nombre: "Luis Herrera", empresa: "Avianca", email: "lherrera@avianca.com", telefono: "+57 305 321 6540", instagram: "@avianca", pipeline: "Negociando", notas: "Requiere permisos especiales aeropuerto.", estetica: "Épico, aéreo", tonos: "Rojo, gris", proyectos: 1, valor: 35000 },
];

const PIPE_COLORS: Record<Pipeline, string> = {
  Aprobada: "bg-[#F5C20020] text-[#F5C200] border-[#F5C20040]",
  Negociando: "bg-[#4a9eff20] text-[#4a9eff] border-[#4a9eff40]",
  Enviada: "bg-[#ffffff15] text-[#FAFAFA] border-[#ffffff30]",
  Rechazada: "bg-[#ff444420] text-[#ff4444] border-[#ff444440]",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function ClientsPage() {
  const [clients] = useState<Client[]>(MOCK);
  const [selected, setSelected] = useState<Client | null>(null);
  const [search, setSearch] = useState("");
  const [filterPipe, setFilterPipe] = useState<string>("Todos");

  const filtered = clients.filter(
    (c) =>
      (filterPipe === "Todos" || c.pipeline === filterPipe) &&
      (c.nombre.toLowerCase().includes(search.toLowerCase()) ||
        c.empresa.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex gap-6 h-full">
      {/* List */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            type="text"
            placeholder="Buscar cliente o empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-sm text-[#FAFAFA] placeholder-[#6b6b6b] focus:outline-none focus:border-[#F5C200]"
          />
          {["Todos", "Aprobada", "Negociando", "Enviada", "Rechazada"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPipe(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filterPipe === p
                  ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                  : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"
              }`}
            >
              {p}
            </button>
          ))}
          <button className="ml-auto px-4 py-2 bg-[#F5C200] text-[#0a0a0a] text-sm font-semibold rounded-lg hover:bg-[#FFD700] transition-colors">
            + Nuevo Cliente
          </button>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              className={`bg-[#1a1a1a] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#F5C200] ${
                selected?.id === c.id ? "border-[#F5C200]" : "border-[#2a2a2a]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F5C20020] border border-[#F5C20040] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#F5C200] font-bold text-sm">{c.nombre[0]}</span>
                  </div>
                  <div>
                    <p className="text-[#FAFAFA] font-medium text-sm">{c.nombre}</p>
                    <p className="text-[#6b6b6b] text-xs">{c.empresa}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[#F5C200] font-semibold text-sm">{fmt(c.valor)}</p>
                    <p className="text-[#6b6b6b] text-xs">{c.proyectos} proyectos</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${PIPE_COLORS[c.pipeline]}`}>
                    {c.pipeline}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-80 flex-shrink-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#F5C200] flex items-center justify-center">
                <span className="text-[#0a0a0a] font-bold">{selected.nombre[0]}</span>
              </div>
              <div>
                <p className="text-[#FAFAFA] font-semibold">{selected.nombre}</p>
                <p className="text-[#6b6b6b] text-xs">{selected.empresa}</p>
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-lg">×</button>
          </div>

          <div className="space-y-4">
            <Section label="Contacto">
              <Row k="Email" v={selected.email} />
              <Row k="Tel" v={selected.telefono} />
              <Row k="RRSS" v={selected.instagram} />
            </Section>

            <Section label="Pipeline">
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${PIPE_COLORS[selected.pipeline]}`}>
                {selected.pipeline}
              </span>
            </Section>

            <Section label="Estilo & Estética">
              <Row k="Estética" v={selected.estetica} />
              <Row k="Tonos" v={selected.tonos} />
            </Section>

            <Section label="Notas Críticas">
              <p className="text-[#FAFAFA] text-xs leading-relaxed bg-[#0a0a0a] rounded-lg p-3 border border-[#2a2a2a]">
                {selected.notas}
              </p>
            </Section>

            <Section label="Historial">
              <Row k="Proyectos" v={String(selected.proyectos)} />
              <Row k="Valor Total" v={fmt(selected.valor)} />
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[#6b6b6b] text-xs font-medium tracking-widest uppercase mb-2">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-[#6b6b6b] text-xs">{k}</span>
      <span className="text-[#FAFAFA] text-xs text-right">{v}</span>
    </div>
  );
}

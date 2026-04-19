"use client";

import { useState } from "react";

type Phase = "creatividad" | "pre" | "pro" | "post";
type SubStage = string;

interface Task {
  id: string;
  titulo: string;
  responsable: string;
  fecha: string;
  hecho: boolean;
}

interface Card {
  id: string;
  proyecto: string;
  cliente: string;
  fase: Phase;
  etapa: SubStage;
  color: string;
  tareas: Task[];
}

const PHASES: { id: Phase; label: string; etapas: string[] }[] = [
  { id: "creatividad", label: "Creatividad", etapas: ["Propuesta", "Seguimiento", "Confirmación"] },
  { id: "pre", label: "Pre-Producción", etapas: ["Guion", "Casting", "Locaciones", "Permisos"] },
  { id: "pro", label: "Producción", etapas: ["Shoot Day 1", "Shoot Day 2", "Gear List", "Call Sheet"] },
  { id: "post", label: "Post-Producción", etapas: ["Montaje", "Color", "Sonido", "VFX", "Entrega"] },
];

const MOCK_CARDS: Card[] = [
  {
    id: "1", proyecto: "Campaña Cerveza X", cliente: "Bavaria",
    fase: "creatividad", etapa: "Confirmación", color: "#F5C200",
    tareas: [
      { id: "t1", titulo: "Brief creativo", responsable: "Luis", fecha: "2026-04-20", hecho: true },
      { id: "t2", titulo: "Storyboard v2", responsable: "Maria", fecha: "2026-04-22", hecho: false },
    ],
  },
  {
    id: "2", proyecto: "Film Publicitario", cliente: "Avianca",
    fase: "pre", etapa: "Casting", color: "#4a9eff",
    tareas: [
      { id: "t3", titulo: "Casting actores", responsable: "Ana", fecha: "2026-04-25", hecho: false },
      { id: "t4", titulo: "Guion técnico", responsable: "Luis", fecha: "2026-04-23", hecho: true },
      { id: "t5", titulo: "Location scout", responsable: "Pedro", fecha: "2026-04-26", hecho: false },
    ],
  },
  {
    id: "3", proyecto: "Documental Marca Y", cliente: "Claro",
    fase: "post", etapa: "Color", color: "#a855f7",
    tareas: [
      { id: "t6", titulo: "Corte offline", responsable: "Luis", fecha: "2026-04-18", hecho: true },
      { id: "t7", titulo: "Color grading", responsable: "Maria", fecha: "2026-04-22", hecho: false },
      { id: "t8", titulo: "Mix de audio", responsable: "Carlos", fecha: "2026-04-24", hecho: false },
    ],
  },
  {
    id: "4", proyecto: "TVC Navidad", cliente: "Éxito",
    fase: "creatividad", etapa: "Propuesta", color: "#22c55e",
    tareas: [
      { id: "t9", titulo: "Concepto creativo", responsable: "Luis", fecha: "2026-04-28", hecho: false },
    ],
  },
  {
    id: "5", proyecto: "Video Corporativo Z", cliente: "Bancolombia",
    fase: "pro", etapa: "Shoot Day 1", color: "#f97316",
    tareas: [
      { id: "t10", titulo: "Confirmación crew", responsable: "Ana", fecha: "2026-04-20", hecho: true },
      { id: "t11", titulo: "Equipment check", responsable: "Pedro", fecha: "2026-04-21", hecho: false },
    ],
  },
];

const PHASE_COLORS: Record<Phase, string> = {
  creatividad: "border-t-[#F5C200]",
  pre: "border-t-[#4a9eff]",
  pro: "border-t-[#f97316]",
  post: "border-t-[#a855f7]",
};

const PHASE_BADGE: Record<Phase, string> = {
  creatividad: "bg-[#F5C20020] text-[#F5C200]",
  pre: "bg-[#4a9eff20] text-[#4a9eff]",
  pro: "bg-[#f97316 20] text-[#f97316]",
  post: "bg-[#a855f720] text-[#a855f7]",
};

export default function PipelinePage() {
  const [cards, setCards] = useState<Card[]>(MOCK_CARDS);
  const [selected, setSelected] = useState<Card | null>(null);
  const [activePhase, setActivePhase] = useState<Phase>("creatividad");

  function toggleTask(cardId: string, taskId: string) {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? { ...c, tareas: c.tareas.map((t) => (t.id === taskId ? { ...t, hecho: !t.hecho } : t)) }
          : c
      )
    );
    if (selected?.id === cardId) {
      setSelected((s) => s ? { ...s, tareas: s.tareas.map((t) => (t.id === taskId ? { ...t, hecho: !t.hecho } : t)) } : s);
    }
  }

  function moveCard(cardId: string, newFase: Phase, newEtapa: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, fase: newFase, etapa: newEtapa } : c))
    );
    setSelected(null);
  }

  const currentPhaseCards = cards.filter((c) => c.fase === activePhase);

  return (
    <div className="space-y-5">
      {/* Phase tabs */}
      <div className="flex gap-2">
        {PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePhase(p.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
              activePhase === p.id
                ? "bg-[#F5C200] text-[#0a0a0a] border-[#F5C200]"
                : "bg-[#1a1a1a] text-[#6b6b6b] border-[#2a2a2a] hover:border-[#F5C200]"
            }`}
          >
            {p.label}
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              activePhase === p.id ? "bg-[#0a0a0a30] text-[#0a0a0a]" : "bg-[#2a2a2a] text-[#6b6b6b]"
            }`}>
              {cards.filter((c) => c.fase === p.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {PHASES.find((p) => p.id === activePhase)?.etapas.map((etapa) => {
          const colCards = currentPhaseCards.filter((c) => c.etapa === etapa);
          return (
            <div key={etapa} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-[#6b6b6b] tracking-widest uppercase">{etapa}</p>
                <span className="text-xs bg-[#2a2a2a] text-[#6b6b6b] px-1.5 py-0.5 rounded">{colCards.length}</span>
              </div>
              <div className="space-y-3">
                {colCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelected(card)}
                    className={`kanban-card bg-[#1a1a1a] border border-[#2a2a2a] border-t-2 ${PHASE_COLORS[card.fase]} rounded-xl p-4 cursor-pointer ${
                      selected?.id === card.id ? "border-[#F5C200] border-t-2" : ""
                    }`}
                  >
                    <p className="text-[#FAFAFA] font-medium text-sm mb-1">{card.proyecto}</p>
                    <p className="text-[#6b6b6b] text-xs mb-3">{card.cliente}</p>
                    {/* Task progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[#6b6b6b] mb-1">
                        <span>Tareas</span>
                        <span>{card.tareas.filter((t) => t.hecho).length}/{card.tareas.length}</span>
                      </div>
                      <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F5C200] rounded-full"
                          style={{ width: `${(card.tareas.filter((t) => t.hecho).length / Math.max(1, card.tareas.length)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#6b6b6b]">
                        {card.tareas.find((t) => !t.hecho)?.fecha || "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#0a0a0a] border-l border-[#1a1a1a] z-50 flex flex-col overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
            <div>
              <p className="text-[#FAFAFA] font-semibold">{selected.proyecto}</p>
              <p className="text-[#6b6b6b] text-xs">{selected.cliente}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#6b6b6b] hover:text-[#FAFAFA] text-xl">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Current position */}
            <div>
              <p className="text-[#6b6b6b] text-xs tracking-widest uppercase mb-2">Posición actual</p>
              <div className="flex gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PHASE_BADGE[selected.fase]}`}>
                  {PHASES.find((p) => p.id === selected.fase)?.label}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#2a2a2a] text-[#FAFAFA]">
                  {selected.etapa}
                </span>
              </div>
            </div>

            {/* Mover a */}
            <div>
              <p className="text-[#6b6b6b] text-xs tracking-widest uppercase mb-2">Mover a</p>
              <div className="grid grid-cols-2 gap-2">
                {PHASES.map((phase) =>
                  phase.etapas.map((etapa) => (
                    <button
                      key={`${phase.id}-${etapa}`}
                      onClick={() => moveCard(selected.id, phase.id, etapa)}
                      disabled={selected.fase === phase.id && selected.etapa === etapa}
                      className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                        selected.fase === phase.id && selected.etapa === etapa
                          ? "bg-[#F5C20020] border-[#F5C200] text-[#F5C200]"
                          : "bg-[#1a1a1a] border-[#2a2a2a] text-[#6b6b6b] hover:border-[#F5C200] hover:text-[#FAFAFA]"
                      }`}
                    >
                      <span className="text-[#6b6b6b]">{phase.label.substring(0, 3)} / </span>
                      {etapa}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <p className="text-[#6b6b6b] text-xs tracking-widest uppercase mb-2">Tareas</p>
              <div className="space-y-2">
                {selected.tareas.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => toggleTask(selected.id, t.id)}
                    className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] cursor-pointer hover:border-[#F5C200] transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      t.hecho ? "bg-[#F5C200] border-[#F5C200]" : "border-[#3a3a3a]"
                    }`}>
                      {t.hecho && <span className="text-[#0a0a0a] text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${t.hecho ? "line-through text-[#6b6b6b]" : "text-[#FAFAFA]"}`}>
                        {t.titulo}
                      </p>
                      <p className="text-xs text-[#6b6b6b]">{t.responsable} · {t.fecha}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

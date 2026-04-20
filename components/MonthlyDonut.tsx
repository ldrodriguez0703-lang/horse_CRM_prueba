"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface Props {
  pct: number;
  mes: string;
  confirmadas: number;
  restante: number;
  meta: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function MonthlyDonut({ pct, mes, confirmadas, restante, meta }: Props) {
  const capped = Math.min(pct, 100);
  const over   = pct > 100;

  const data = [
    { value: capped },
    { value: Math.max(0, 100 - capped) },
  ];

  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-xs font-semibold text-[#FAFAFA] tracking-wide">{mes}</p>
      <div className="relative w-24 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={28}
              outerRadius={38}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={over ? "#22c55e" : pct >= 80 ? "#F5C200" : "#F5C200"} />
              <Cell fill="#2a2a2a" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Porcentaje central */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xs font-bold ${over ? "text-[#22c55e]" : "text-[#F5C200]"}`}>
            {pct}%
          </span>
        </div>
      </div>
      <p className="text-xs text-[#22c55e] font-medium">{fmt(confirmadas)}</p>
      {restante > 0 && (
        <p className="text-xs text-[#6b6b6b]">Falta: {fmt(restante)}</p>
      )}
      {over && (
        <p className="text-xs text-[#22c55e]">+{fmt(confirmadas - meta)}</p>
      )}
    </div>
  );
}

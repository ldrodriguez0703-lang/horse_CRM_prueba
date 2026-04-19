"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ChartData {
  mes: string;
  confirmado: number;
  enCurso: number;
  meta: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function SalesChart({ data }: { data: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis dataKey="mes" tick={{ fill: "#6b6b6b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#6b6b6b", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#FAFAFA" }}
          formatter={(value) => [fmt(Number(value)), ""]}
        />
        <ReferenceLine y={data[0]?.meta ?? 50000} stroke="#F5C200" strokeDasharray="4 4" label={{ value: "Meta", fill: "#F5C200", fontSize: 10, position: "insideTopRight" }} />
        <Bar dataKey="confirmado" name="Confirmado" fill="#F5C200" radius={[4, 4, 0, 0]} />
        <Bar dataKey="enCurso" name="En Curso" fill="#3a3a3a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

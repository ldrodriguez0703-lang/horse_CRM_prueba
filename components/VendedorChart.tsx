"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { VendedorMonthData } from "@/lib/sheets";

const COLORS = ["#F5C200", "#4a9eff", "#22c55e", "#f97316", "#a855f7", "#ec4899"];

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
}

export default function VendedorChart({
  data,
  vendedores,
}: {
  data: VendedorMonthData[];
  vendedores: string[];
}) {
  const flat = data.map((d) => ({ mes: d.mes, ...d.totales }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={flat} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis dataKey="mes" tick={{ fill: "#6b6b6b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: "#6b6b6b", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#FAFAFA" }}
          formatter={(value) => [fmt(Number(value)), ""]}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "#6b6b6b" }} />
        {vendedores.map((v, i) => (
          <Bar key={v} dataKey={v} name={v} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

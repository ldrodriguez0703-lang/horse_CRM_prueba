"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList,
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
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={flat} margin={{ top: 20, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis
          dataKey="mes"
          tick={{ fill: "#9b9b9b", fontSize: 12, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
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
        <Legend wrapperStyle={{ fontSize: 11, color: "#9b9b9b" }} />
        {vendedores.map((v, i) => (
          <Bar key={v} dataKey={v} name={v} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey={v}
              position="inside"
              formatter={(val: unknown) =>
                Number(val) > 500 ? `$${(Number(val) / 1000).toFixed(1)}k` : ""
              }
              style={{ fill: "#0a0a0a", fontSize: 9, fontWeight: "bold" }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

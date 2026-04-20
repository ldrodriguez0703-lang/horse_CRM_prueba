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
  const flat: Array<Record<string, string | number>> = data.map((d) => ({ mes: d.mes, ...d.totales }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={flat} margin={{ top: 28, right: 4, left: 0, bottom: 0 }}>
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
        {vendedores.map((v, i) => {
          const color = COLORS[i % COLORS.length];
          const shortName = v.split(" ")[0];
          return (
            <Bar key={v} dataKey={v} name={v} fill={color} radius={[4, 4, 0, 0]}>
              {/* Value label inside bar */}
              <LabelList
                dataKey={v}
                position="inside"
                formatter={(val: unknown) =>
                  Number(val) > 500 ? `$${(Number(val) / 1000).toFixed(1)}k` : ""
                }
                style={{ fill: "#0a0a0a", fontSize: 9, fontWeight: "bold" }}
              />
              {/* Name label above bar with crown for the highest */}
              <LabelList
                dataKey={v}
                content={({ x, y, width, value, index }) => {
                  if (!value || Number(value) === 0 || index === undefined) return null;
                  const row = flat[index as number];
                  if (!row) return null;
                  const max = Math.max(...vendedores.map((vv) => Number(row[vv] ?? 0)));
                  const isCrown = Number(value) === max && max > 0;
                  return (
                    <text
                      key={`lbl-${v}-${index}`}
                      x={Number(x ?? 0) + Number(width ?? 0) / 2}
                      y={Number(y ?? 0) - 5}
                      textAnchor="middle"
                      fontSize={isCrown ? 10 : 9}
                      fontWeight={isCrown ? "bold" : "normal"}
                      fill={isCrown ? color : "#4a4a4a"}
                    >
                      {isCrown ? `👑 ${shortName}` : shortName}
                    </text>
                  );
                }}
              />
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}

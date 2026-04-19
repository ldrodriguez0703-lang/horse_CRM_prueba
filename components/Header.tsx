"use client";

import { usePathname } from "next/navigation";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard Ventas",
  "/dashboard/clients": "CRM Clientes",
  "/dashboard/pipeline": "Production Pipeline",
  "/dashboard/finance": "Finanzas & Legal",
};

export default function Header() {
  const path = usePathname();
  const title = titles[path] || "CRM";

  return (
    <header className="h-14 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-[#FAFAFA] font-semibold text-sm tracking-wide">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[#F5C200] text-xs font-medium bg-[#F5C20015] px-2.5 py-1 rounded-full border border-[#F5C20030]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5C200] animate-pulse" />
          Producción Activa
        </span>
      </div>
    </header>
  );
}

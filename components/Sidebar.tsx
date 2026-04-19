"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "◈" },
  { href: "/dashboard/clients", label: "CRM Clientes", icon: "◉" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "◫" },
  { href: "/dashboard/finance", label: "Finanzas & Legal", icon: "◎" },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b border-[#1a1a1a]">
        <div className="relative h-10 w-36">
          <Image
            src="https://horse-inmotion.com/wp-content/uploads/2025/08/horse-amarillo-web-1-1.png"
            alt="Horse In Motion"
            fill
            className="object-contain object-left"
            unoptimized
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {nav.map((item) => {
          const active = path === item.href || (item.href !== "/dashboard" && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-[#F5C200] text-[#0a0a0a] font-semibold"
                  : "text-[#6b6b6b] hover:bg-[#1a1a1a] hover:text-[#FAFAFA]"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F5C200] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0a0a0a] font-bold text-xs">L</span>
          </div>
          <div>
            <p className="text-[#FAFAFA] text-sm font-medium">Luis</p>
            <p className="text-[#6b6b6b] text-xs">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

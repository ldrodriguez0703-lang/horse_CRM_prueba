"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();

  function handleLogin() {
    // Single user: luis — direct entry
    document.cookie = "crm_user=luis; path=/; max-age=86400";
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-48 h-20 mb-6">
            <Image
              src="https://horse-inmotion.com/wp-content/uploads/2025/08/horse-amarillo-web-1-1.png"
              alt="Horse In Motion"
              fill
              className="object-contain"
              unoptimized
              priority
            />
          </div>
          <p className="text-[#6b6b6b] text-sm tracking-widest uppercase">
            CRM
          </p>
        </div>

        {/* Login box */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8">
          <h2 className="text-[#6b6b6b] text-xs tracking-widest uppercase mb-6">
            Selecciona tu usuario
          </h2>

          <button
            onClick={handleLogin}
            className="w-full group flex items-center gap-4 p-4 rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#F5C200] hover:bg-[#F5C20010] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-[#F5C200] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0a0a0a] font-bold text-sm">L</span>
            </div>
            <div className="text-left">
              <p className="text-[#FAFAFA] font-medium">Luis</p>
              <p className="text-[#6b6b6b] text-xs">Administrador</p>
            </div>
            <div className="ml-auto text-[#F5C200] opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </div>
          </button>
        </div>

        <p className="text-center text-[#3a3a3a] text-xs mt-8">
          Horse In Motion © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

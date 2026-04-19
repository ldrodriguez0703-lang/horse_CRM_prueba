import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Horse In Motion CRM",
  description: "CRM para Horse In Motion Productora Audiovisual",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} min-h-full bg-[#0a0a0a] text-[#FAFAFA] antialiased`}>
        {children}
      </body>
    </html>
  );
}

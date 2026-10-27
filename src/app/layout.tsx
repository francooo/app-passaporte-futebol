import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Passaporte Esportivo",
    template: "%s · Passaporte Esportivo",
  },
  description:
    "Registre estádios, partidas e visitas e colecione carimbos no seu passaporte do futebol.",
  applicationName: "Passaporte Esportivo",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Passaporte", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#123A32",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${oswald.variable} ${inter.variable} h-full antialiased`}>
      <body className="papel flex min-h-full flex-col">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { KitIcon } from "@/components/ui/kit-icon";

export const metadata: Metadata = { title: "Mapa dos estádios" };

export default function MapaPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="titulo-display text-4xl text-estadio">Mapa dos estádios</h1>
        <p className="text-suave">Explore o futebol pelo mundo</p>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-4">
        <KitIcon name="search" size={22} />
        <span className="sr-only">Buscar país ou estádio</span>
        <input
          type="search"
          placeholder="Buscar país ou estádio"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
        />
      </label>

      <section className="rounded-2xl border-4 border-ingresso bg-white p-3">
        <p className="rotulo-display mb-2 text-xs text-suave">Mapa-múndi</p>
        <Image src="/map/world-map.svg" alt="" width={720} height={320} className="h-auto w-full" unoptimized />
      </section>

      <p className="rounded-xl border border-dashed border-linha p-4 text-sm text-suave">
        Seleção de país, ranking por capacidade e mapa navegável chegam na Fase 4, conectados ao catálogo de estádios.
      </p>
    </div>
  );
}

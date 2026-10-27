import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { FlagBR } from "@/components/ui/flag-br";
import { KitIcon } from "@/components/ui/kit-icon";
import { demoCountryRanking } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Mapa dos estádios" };

const capacity = new Intl.NumberFormat("pt-BR");

export default function MapaPage() {
  const { country, stadiums } = demoCountryRanking;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">Mapa dos estádios</h1>
          <p className="mt-1 text-suave lg:mt-3 lg:text-lg">Explore o futebol pelo mundo</p>
        </div>
        <span className="rotulo-display flex items-center gap-1 rounded-full border border-linha bg-partida/60 px-3 py-1 text-sm text-estadio">
          ✦ IA
        </span>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
        <section className="flex flex-col rounded-2xl border-4 border-ingresso bg-white p-3 lg:col-span-8 lg:p-6">
          <p className="rotulo-display mb-2 text-xs text-suave lg:text-sm">Mapa-múndi</p>
          <Image src="/map/world-map.svg" alt="" width={720} height={320} className="my-auto h-auto w-full" unoptimized />
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-4">
            <KitIcon name="search" size={22} />
            <span className="sr-only">Buscar país ou estádio</span>
            <input
              type="search"
              placeholder="Buscar país ou estádio"
              className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
            />
          </label>

          <div className="flex min-h-14 items-center justify-between rounded-xl border border-linha bg-papel px-4">
            <span className="flex items-center gap-3 font-display text-xl font-semibold text-estadio">
              <FlagBR /> {country}
            </span>
            <span className="rotulo-display text-xs text-suave">País selecionado</span>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="titulo-display text-2xl text-estadio">Estádios do {country}</h2>
            <span className="rounded-full border border-linha bg-white px-3 py-1 text-xs font-semibold text-estadio">
              ▾ Maior capacidade
            </span>
          </div>

          <ol className="flex flex-col gap-3">
            {stadiums.map((s, i) => (
              <li
                key={s.id}
                className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 rounded-xl border border-linha bg-white p-3"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-estadio font-display text-lg font-bold text-ingresso">
                  {i + 1}º
                </span>
                <KitIcon name="stadium" size={28} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-estadio">{s.name}</span>
                  <span className="block text-sm text-suave">{s.city}</span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-xl font-bold text-estadio">{capacity.format(s.capacity)}</span>
                  <span className="block text-xs text-suave">lugares</span>
                </span>
              </li>
            ))}
          </ol>

          <ButtonLink href="/app/mapa" className="border-2 border-estadio text-lg">
            Ver todos os estádios <KitIcon name="arrow-right" size={20} />
          </ButtonLink>

          <p className="text-xs text-suave">
            Capacidades demonstrativas. Seleção de país e mapa navegável chegam na Fase 4.
          </p>
        </aside>
      </div>
    </div>
  );
}

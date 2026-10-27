import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Greeting, GreetingFallback } from "@/components/app/greeting";
import { ButtonLink } from "@/components/ui/button";
import { FlagBR } from "@/components/ui/flag-br";
import { KitIcon } from "@/components/ui/kit-icon";
import { Ticket } from "@/components/ui/ticket";
import { demoNearby } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <Suspense fallback={<GreetingFallback />}>
          <Greeting />
        </Suspense>
        <p className="rotulo-display text-right text-xs leading-tight text-estadio">
          Explorar
          <br />
          Colecionar
          <br />
          Viver o futebol
        </p>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-4">
        <KitIcon name="search" size={22} />
        <span className="sr-only">Buscar</span>
        <input
          type="search"
          placeholder="País, cidade ou estádio"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
        />
      </label>

      <Ticket className="-mx-5 rounded-none px-5" innerClassName="p-3">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Image
            src="/map/world-map.svg"
            alt="Mapa-múndi"
            width={720}
            height={320}
            className="h-auto w-full"
            unoptimized
            priority
          />
          <p className="rotulo-display text-right text-[0.65rem] leading-tight text-estadio">
            O mundo
            <br />
            também
            <br />
            joga aqui
          </p>
        </div>
        <button
          type="button"
          className="mx-auto mt-2 flex min-h-11 w-4/5 items-center justify-between rounded-xl border border-linha bg-white px-4"
        >
          <span className="flex items-center gap-3 text-lg">
            <FlagBR /> Brasil
          </span>
          <span aria-hidden className="text-estadio">▾</span>
        </button>
      </Ticket>

      <Link
        href="/app/mapa"
        className="flex min-h-12 items-center justify-between rounded-xl border border-linha bg-white px-4"
      >
        <span className="flex items-center gap-2">
          <KitIcon name="location-pin" size={22} />
          Usar minha localização
        </span>
        <KitIcon name="arrow-right" size={20} />
      </Link>

      <section aria-labelledby="proximos" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="proximos" className="titulo-display text-3xl text-estadio">
            Estádios próximos
          </h2>
          <Link href="/app/mapa" className="text-sm font-semibold text-estadio">
            Ver todos ›
          </Link>
        </div>
        {demoNearby.map((s) => (
          <Link
            key={s.id}
            href="/app/mapa"
            className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-linha bg-white pr-3"
          >
            <div className="relative h-24 bg-partida">
              {s.photoUrl ? (
                <Image src={s.photoUrl} alt="" fill sizes="8rem" className="object-cover" />
              ) : (
                <KitIcon name="stadium" size={48} className="absolute inset-0 m-auto" />
              )}
            </div>
            <div>
              <h3 className="titulo-display text-xl text-estadio">{s.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-sm text-suave">
                <KitIcon name="location-pin" size={16} />
                {s.distanceKm.toLocaleString("pt-BR")} km
              </p>
            </div>
            <KitIcon name="arrow-right" size={20} />
          </Link>
        ))}
      </section>

      <ButtonLink href="/app/passaporte" icon={<KitIcon name="camera-ai" size={30} />}>
        Registrar com IA
      </ButtonLink>
    </div>
  );
}

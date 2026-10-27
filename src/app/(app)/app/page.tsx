import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Greeting, GreetingFallback } from "@/components/app/greeting";
import { ButtonLink } from "@/components/ui/button";
import { FlagBR } from "@/components/ui/flag-br";
import { KitIcon } from "@/components/ui/kit-icon";
import { Ticket } from "@/components/ui/ticket";
import { demoNearby, demoVisits } from "@/lib/demo-data";

export default function HomePage() {
  const stamps = demoVisits.length;
  const stadiums = new Set(demoVisits.map((v) => v.stadium)).size;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-end justify-between gap-4">
        <Suspense fallback={<GreetingFallback />}>
          <Greeting />
        </Suspense>
        <div className="flex items-center gap-6">
          <p className="rotulo-display text-right text-xs leading-tight text-estadio lg:text-sm">
            Explorar
            <br />
            Colecionar
            <br />
            Viver o futebol
          </p>
          <div className="hidden lg:block">
            <ButtonLink href="/app/passaporte" icon={<KitIcon name="camera-ai" size={30} />}>
              Registrar com IA
            </ButtonLink>
          </div>
        </div>
      </div>

      <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-4 lg:hidden">
        <KitIcon name="search" size={22} />
        <span className="sr-only">Buscar</span>
        <input
          type="search"
          placeholder="País, cidade ou estádio"
          className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
        />
      </label>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
        <Ticket className="-mx-5 rounded-none px-5 md:mx-0 md:rounded-ticket lg:col-span-8" innerClassName="p-3 lg:p-6">
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
            <p className="rotulo-display text-right text-[0.65rem] leading-tight text-estadio lg:text-sm">
              O mundo
              <br />
              também
              <br />
              joga aqui
            </p>
          </div>
          <button
            type="button"
            className="mx-auto mt-2 flex min-h-11 w-4/5 max-w-sm items-center justify-between rounded-xl border border-linha bg-white px-4 lg:mt-4"
          >
            <span className="flex items-center gap-3 text-lg">
              <FlagBR /> Brasil
            </span>
            <span aria-hidden className="text-estadio">▾</span>
          </button>
        </Ticket>

        <aside className="flex flex-col gap-5 lg:col-span-4">
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

          <Link
            href="/app/passaporte"
            className="papel hidden flex-1 flex-col justify-between gap-4 rounded-2xl border border-estadio/10 p-6 shadow-sm lg:flex"
          >
            <div className="flex items-center justify-between">
              <h2 className="titulo-display text-2xl text-estadio">Meu Passaporte</h2>
              <KitIcon name="passport" size={32} />
            </div>
            <dl className="grid grid-cols-2 divide-x divide-linha">
              <div className="flex flex-col-reverse">
                <dt className="font-display text-lg text-estadio">carimbos</dt>
                <dd className="titulo-display text-6xl text-estadio">{stamps}</dd>
              </div>
              <div className="flex flex-col-reverse pl-6">
                <dt className="font-display text-lg text-estadio">estádios</dt>
                <dd className="titulo-display text-6xl text-estadio">{stadiums}</dd>
              </div>
            </dl>
            <span className="flex items-center gap-1 text-sm font-semibold text-estadio">
              Ver meus carimbos <KitIcon name="arrow-right" size={16} />
            </span>
          </Link>
        </aside>
      </div>

      <section aria-labelledby="proximos" className="flex flex-col gap-3 lg:gap-5">
        <div className="flex items-baseline justify-between">
          <h2 id="proximos" className="titulo-display text-3xl text-estadio lg:text-4xl">
            Estádios próximos
          </h2>
          <Link href="/app/mapa" className="text-sm font-semibold text-estadio">
            Ver todos ›
          </Link>
        </div>
        <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {demoNearby.map((s) => (
            <li key={s.id}>
              <Link
                href="/app/mapa"
                className="grid grid-cols-[8rem_1fr_auto] items-center gap-3 overflow-hidden rounded-2xl border border-linha bg-white pr-3 transition-shadow hover:shadow-md lg:grid-cols-1 lg:pr-0"
              >
                <div className="relative h-24 bg-partida lg:h-44">
                  {s.photoUrl ? (
                    <Image src={s.photoUrl} alt="" fill sizes="(min-width: 1024px) 400px, 8rem" className="object-cover" />
                  ) : (
                    <KitIcon name="stadium" size={56} className="absolute inset-0 m-auto" />
                  )}
                </div>
                <div className="lg:flex lg:items-center lg:justify-between lg:px-5 lg:pb-5">
                  <div>
                    <h3 className="titulo-display text-xl text-estadio lg:text-2xl">{s.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-suave">
                      <KitIcon name="location-pin" size={16} />
                      {s.distanceKm.toLocaleString("pt-BR")} km
                    </p>
                  </div>
                  <KitIcon name="arrow-right" size={20} className="hidden lg:block" />
                </div>
                <KitIcon name="arrow-right" size={20} className="lg:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <ButtonLink href="/app/passaporte" className="lg:hidden" icon={<KitIcon name="camera-ai" size={30} />}>
        Registrar com IA
      </ButtonLink>
    </div>
  );
}

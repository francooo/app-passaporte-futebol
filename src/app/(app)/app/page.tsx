import Link from "next/link";
import { Suspense } from "react";
import { Greeting, GreetingFallback } from "@/components/app/greeting";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { Ticket } from "@/components/ui/ticket";
import { NearbyStadiums } from "@/components/visits/nearby-stadiums";
import { PassportMap } from "@/components/visits/passport-map";
import { VisitStamp } from "@/components/visits/visit-stamp";
import { getCurrentUser } from "@/lib/dal";
import { listVisits } from "@/lib/visits";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-end justify-between gap-4">
        <Suspense fallback={<GreetingFallback />}>
          <Greeting />
        </Suspense>
        <p className="rotulo-display text-right text-xs leading-tight text-estadio lg:text-sm">
            Explorar
            <br />
            Colecionar
            <br />
            Viver o futebol
          </p>
      </div>

      <form action="/app/mapa" role="search" className="lg:hidden">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border border-linha bg-white px-4 focus-within:border-estadio">
          <KitIcon name="search" size={22} />
          <span className="sr-only">Buscar país, cidade ou estádio</span>
          <input
            name="q"
            type="search"
            placeholder="País, cidade ou estádio"
            className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
          />
        </label>
      </form>

      <Suspense fallback={<HomeSkeleton />}>
        <Passport />
      </Suspense>

      <NearbyStadiums />

      <ButtonLink href="/app/registrar" className="lg:hidden" icon={<KitIcon name="camera-ai" size={30} />}>
        Adicionar carimbo
      </ButtonLink>
    </div>
  );
}

async function Passport() {
  const user = await getCurrentUser();
  const list = await listVisits(user.id);
  const countries = new Set(list.items.map((v) => v.stadium.country));
  const latest = list.items.slice(0, 3);

  return (
    <>
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
        <Ticket className="-mx-5 rounded-none px-5 md:mx-0 md:rounded-ticket lg:col-span-8" innerClassName="p-3 lg:p-6">
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <PassportMap visited={countries} />
            <p className="rotulo-display text-right text-[0.65rem] leading-tight text-estadio lg:text-sm">
              O mundo
              <br />
              também
              <br />
              joga aqui
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 lg:mt-4">
            <p className="font-display text-lg text-estadio">
              {countries.size ? (
                <>
                  <span className="mr-1 inline-block size-3 rounded-sm bg-ingresso ring-1 ring-estadio" aria-hidden />
                  {countries.size} {countries.size === 1 ? "país carimbado" : "países carimbados"}
                </>
              ) : (
                "Seu primeiro carimbo pinta o país no mapa"
              )}
            </p>
            <Link href="/app/mapa" className="flex min-h-11 items-center gap-1 text-sm font-semibold text-estadio">
              Explorar o mapa <KitIcon name="arrow-right" size={16} />
            </Link>
          </div>
        </Ticket>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <Link
            href="/app/passaporte"
            className="papel flex flex-1 flex-col justify-between gap-4 rounded-2xl border border-estadio/10 p-5 shadow-sm lg:p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="titulo-display text-2xl text-estadio">Meu Passaporte</h2>
              <KitIcon name="passport" size={32} />
            </div>
            <dl className="grid grid-cols-2 divide-x divide-linha">
              <div className="flex flex-col-reverse">
                <dt className="font-display text-lg text-estadio">{list.totals.stamps === 1 ? "carimbo" : "carimbos"}</dt>
                <dd className="titulo-display text-5xl text-estadio lg:text-6xl">{list.totals.stamps}</dd>
              </div>
              <div className="flex flex-col-reverse pl-6">
                <dt className="font-display text-lg text-estadio">{list.totals.stadiums === 1 ? "estádio" : "estádios"}</dt>
                <dd className="titulo-display text-5xl text-estadio lg:text-6xl">{list.totals.stadiums}</dd>
              </div>
            </dl>
            <span className="flex items-center gap-1 text-sm font-semibold text-estadio">
              Ver meus carimbos <KitIcon name="arrow-right" size={16} />
            </span>
          </Link>
          <Link
            href="/app/estatisticas"
            className="flex min-h-14 items-center justify-between rounded-xl border border-linha bg-white px-4 font-display text-lg font-semibold text-estadio hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <KitIcon name="stats" size={24} /> Sua jornada em números
            </span>
            <KitIcon name="arrow-right" size={20} />
          </Link>
        </aside>
      </div>

      <section aria-labelledby="ultimos" className="flex flex-col gap-3 lg:gap-5">
        <div className="flex items-baseline justify-between">
          <h2 id="ultimos" className="titulo-display text-3xl text-estadio lg:text-4xl">
            Últimos carimbos
          </h2>
          {latest.length > 0 && (
            <Link href="/app/passaporte" className="text-sm font-semibold text-estadio">
              Ver todos ›
            </Link>
          )}
        </div>
        {latest.length ? (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-6">
            {latest.map((v) => (
              <li key={v.id}>
                <VisitStamp visit={v} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="papel flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linha p-6 text-center lg:flex-row lg:justify-between lg:text-left">
            <div className="flex flex-col items-center gap-3 lg:flex-row">
              <KitIcon name="stamp-visita" size={48} />
              <div>
                <p className="titulo-display text-2xl text-estadio">Seu passaporte está em branco</p>
                <p className="text-suave">Registre a primeira visita a um estádio ou uma partida que você viu ao vivo.</p>
              </div>
            </div>
            <ButtonLink href="/app/registrar" className="shrink-0" icon={<KitIcon name="camera-ai" size={26} />}>
              Adicionar carimbo
            </ButtonLink>
          </div>
        )}
      </section>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8" aria-busy>
      <div className="aspect-[720/340] animate-pulse rounded-ticket bg-white/60 lg:col-span-8" />
      <div className="h-48 animate-pulse rounded-2xl bg-white/60 lg:col-span-4" />
    </div>
  );
}

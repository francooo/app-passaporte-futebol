import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CountrySelect } from "@/components/catalog/country-select";
import { StadiumRow } from "@/components/catalog/stadium-bits";
import { WorldMap } from "@/components/catalog/world-map";
import { KitIcon } from "@/components/ui/kit-icon";
import { listCountries, listStadiums } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Mapa dos estádios" };

const DEFAULT_COUNTRY = "BRA";
const TOP = 5;

export default function MapaPage({ searchParams }: PageProps<"/app/mapa">) {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">Mapa dos estádios</h1>
          <p className="mt-1 text-suave lg:mt-3 lg:text-lg">Explore o futebol pelo mundo</p>
        </div>
      </div>
      <Suspense fallback={<MapaSkeleton />}>
        <MapaContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MapaContent({ searchParams }: Pick<PageProps<"/app/mapa">, "searchParams">) {
  const { pais } = await searchParams;
  const countries = await listCountries();
  const available = new Map(countries.map((c) => [c.iso3, c.name]));
  const requested = typeof pais === "string" ? pais.toUpperCase() : DEFAULT_COUNTRY;
  const selected = available.has(requested) ? requested : DEFAULT_COUNTRY;
  const country = countries.find((c) => c.iso3 === selected);
  const top = await listStadiums({ country: selected, pageSize: TOP });

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
      <section className="rounded-2xl border-4 border-ingresso bg-white p-3 lg:col-span-8 lg:flex lg:flex-col lg:p-6">
        <p className="rotulo-display mb-2 text-xs text-suave lg:text-sm">Mapa-múndi · toque num país</p>
        <WorldMap selected={selected} available={available} className="lg:my-auto" />
        <p className="mt-2 text-xs text-suave">
          Mapa: Natural Earth · Dados: Wikidata ·{" "}
          <Link href="/creditos" className="underline underline-offset-2">
            Créditos das imagens
          </Link>
        </p>
      </section>

      <aside className="flex flex-col gap-4 lg:col-span-4">
        <CountrySelect countries={countries} selected={selected} />

        <div className="flex items-baseline justify-between gap-2">
          <h2 className="titulo-display text-2xl text-estadio">
            Estádios: {country?.name ?? selected}
          </h2>
          <span className="shrink-0 text-sm text-suave">{top.total} no catálogo</span>
        </div>

        {top.items.length ? (
          <ol className="flex flex-col gap-3">
            {top.items.map((s, i) => (
              <li key={s.id}>
                <StadiumRow stadium={s} position={i + 1} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-xl border border-dashed border-linha p-4 text-sm text-suave">
            Ainda não há estádios deste país no catálogo.
          </p>
        )}

        <Link
          href={`/app/estadios?pais=${selected}`}
          className="flex min-h-12 items-center justify-between rounded-xl border-2 border-estadio bg-ingresso px-5 font-display text-lg font-semibold text-estadio hover:bg-ingresso-escuro"
        >
          Ver todos os estádios <KitIcon name="arrow-right" size={20} />
        </Link>
      </aside>
    </div>
  );
}

function MapaSkeleton() {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8" aria-busy>
      <div className="aspect-[720/320] animate-pulse rounded-2xl bg-white/60 lg:col-span-8" />
      <div className="flex flex-col gap-3 lg:col-span-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-white/60" />
        ))}
      </div>
    </div>
  );
}

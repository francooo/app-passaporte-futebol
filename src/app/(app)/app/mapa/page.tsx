import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SPORT_COPY, venuePlural } from "@shared/sport-copy";
import { parseSport, SPORT_INFO, SPORTS, type Sport } from "@shared/sports";
import { CountrySelect } from "@/components/catalog/country-select";
import { NearMe } from "@/components/catalog/near-me";
import { StadiumRow } from "@/components/catalog/stadium-bits";
import { WorldMap } from "@/components/catalog/world-map";
import { KitIcon } from "@/components/ui/kit-icon";
import { cn } from "@/lib/cn";
import { listCountries, listStadiums, searchStadiums } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Mapa" };

const DEFAULT_COUNTRY = "BRA";
const TOP = 5;

export default function MapaPage({ searchParams }: PageProps<"/app/mapa">) {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">Mapa</h1>
          <p className="mt-1 text-suave lg:mt-3 lg:text-lg">Explore estádios e arenas pelo mundo</p>
        </div>
      </div>
      <Suspense fallback={<MapaSkeleton />}>
        <MapaContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function MapaContent({ searchParams }: Pick<PageProps<"/app/mapa">, "searchParams">) {
  const { pais, q: rawQ, esporte } = await searchParams;
  const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 80) : "";
  // Filtro de esporte: países, ranking e próximos jogos só daquele esporte (padrão: futebol)
  const sport: Sport = parseSport(typeof esporte === "string" ? esporte : null) ?? "futebol";
  const countries = await listCountries(sport);
  const available = new Map(countries.map((c) => [c.iso3, c.name]));
  // Busca da barra superior: um nome de país seleciona o país; o texto também procura estádios e cidades
  const byName = q ? countries.find((c) => fold(c.name) === fold(q)) : undefined;
  const requested = typeof pais === "string" ? pais.toUpperCase() : (byName?.iso3 ?? DEFAULT_COUNTRY);
  const selected = available.has(requested) ? requested : available.has(DEFAULT_COUNTRY) ? DEFAULT_COUNTRY : (countries[0]?.iso3 ?? DEFAULT_COUNTRY);
  const country = countries.find((c) => c.iso3 === selected);
  const [top, found] = await Promise.all([
    listStadiums({ country: selected, pageSize: TOP, sport }),
    q.length >= 2 && !byName ? searchStadiums(q, 12, sport) : Promise.resolve(null),
  ]);
  const sportHref = (s: Sport) => `/app/mapa?${new URLSearchParams({ pais: selected, ...(s !== "futebol" ? { esporte: s } : {}) })}`;
  const source = SPORT_COPY[sport].source;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <nav aria-label="Esporte" className="flex flex-wrap gap-2">
        {SPORTS.map((s) => (
          <Link
            key={s}
            href={sportHref(s)}
            scroll={false}
            aria-current={s === sport ? "page" : undefined}
            className={cn(
              "inline-flex min-h-12 items-center gap-2 rounded-full border px-4 font-display text-lg text-estadio",
              s === sport ? "border-ingresso bg-ingresso font-semibold" : "border-estadio/30 bg-white hover:bg-partida/50",
            )}
          >
            <KitIcon name={SPORT_INFO[s].icon} size={22} />
            {SPORT_INFO[s].label}
          </Link>
        ))}
      </nav>
      {found && (
        <section aria-labelledby="busca" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="busca" className="titulo-display text-2xl text-estadio lg:text-3xl">
              Resultados para “{q}”
            </h2>
            <Link href="/app/mapa" className="shrink-0 text-sm font-semibold text-estadio underline underline-offset-4">
              Limpar busca
            </Link>
          </div>
          {found.length ? (
            <ol className="grid gap-3 lg:grid-cols-2">
              {found.map((s) => (
                <li key={s.id}>
                  <StadiumRow stadium={s} />
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed border-linha p-4 text-suave">
              Nenhum estádio ou cidade encontrado. Tente outro nome ou escolha um país no mapa.
            </p>
          )}
        </section>
      )}
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:gap-8">
      <section className="rounded-2xl border-4 border-ingresso bg-white p-3 lg:col-span-8 lg:flex lg:flex-col lg:p-6">
        <p className="rotulo-display mb-2 text-xs text-suave lg:text-sm">Mapa-múndi · toque num país</p>
        <WorldMap selected={selected} available={available} sport={sport} className="lg:my-auto" />
        <p className="mt-2 text-xs text-suave">
          Mapa: Natural Earth · Dados: Wikidata ·{" "}
          <Link href="/creditos" className="underline underline-offset-2">
            Créditos das imagens
          </Link>
        </p>
      </section>

      <aside className="flex flex-col gap-4 lg:col-span-4">
        <CountrySelect countries={countries} selected={selected} sport={sport} />

        <NearMe sport={sport} selected={selected} />

        <div className="flex items-baseline justify-between gap-2">
          <h2 className="titulo-display text-2xl text-estadio">
            {venuePlural(sport)}: {country?.name ?? selected}
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
            {sport === "futebol"
              ? "Ainda não há estádios deste país no catálogo."
              : `Ainda não há ginásios ou arenas de ${SPORT_INFO[sport].label.toLowerCase()} deste país no catálogo. Ao registrar um carimbo, você pode cadastrar o local.`}
          </p>
        )}
        <p className="-mt-1 text-xs text-suave">
          {source
            ? `Próximo jogo (${source}) nos próximos 30 dias, no local do mandante.`
            : `Ainda não temos uma fonte de jogos de ${SPORT_INFO[sport].label.toLowerCase()}.`}
        </p>

        <Link
          href={`/app/estadios?${new URLSearchParams({ pais: selected, ...(sport !== "futebol" ? { esporte: sport } : {}) })}`}
          className="flex min-h-12 items-center justify-between rounded-xl border-2 border-estadio bg-ingresso px-5 font-display text-lg font-semibold text-estadio hover:bg-ingresso-escuro"
        >
          Ver todos: {venuePlural(sport).toLowerCase()} <KitIcon name="arrow-right" size={20} />
        </Link>
      </aside>
    </div>
    </div>
  );
}

/** Compara nomes sem acentos e sem diferenciar maiúsculas. */
function fold(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
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

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { Ticket } from "@/components/ui/ticket";
import { FilterSelect } from "@/components/visits/filter-select";
import { VisitStamp } from "@/components/visits/visit-stamp";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/dal";
import { listVisits } from "@/lib/visits";

export const metadata: Metadata = { title: "Meu Passaporte" };

type Search = Awaited<PageProps<"/app/passaporte">["searchParams"]>;

function Counters({ stamps, stadiums, className }: { stamps: number; stadiums: number; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2", className)}>
      <div className="flex flex-row-reverse items-baseline justify-center gap-2 border-r border-linha">
        <dt className="font-display text-xl text-estadio">{stamps === 1 ? "carimbo" : "carimbos"}</dt>
        <dd className="titulo-display text-5xl text-estadio lg:text-6xl">{stamps}</dd>
      </div>
      <div className="flex flex-row-reverse items-baseline justify-center gap-2">
        <dt className="font-display text-xl text-estadio">{stadiums === 1 ? "estádio" : "estádios"}</dt>
        <dd className="titulo-display text-5xl text-estadio lg:text-6xl">{stadiums}</dd>
      </div>
    </dl>
  );
}

export default function PassaportePage({ searchParams }: PageProps<"/app/passaporte">) {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div>
        <h1 className="titulo-display text-5xl text-estadio lg:text-7xl">Meu Passaporte</h1>
        <p className="mt-1 font-display text-xl tracking-wide text-tinta lg:text-3xl">Suas visitas, suas histórias.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-ticket bg-white/60" />}>
        <Collection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: Search[string]) => (typeof v === "string" ? v : undefined);

async function Collection({ searchParams }: Pick<PageProps<"/app/passaporte">, "searchParams">) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const tipo = one(params.tipo);
  const ano = Number(one(params.ano));
  const competicao = one(params.competicao)?.slice(0, 80);

  const list = await listVisits(user.id, {
    kind: tipo === "partida" ? "match" : tipo === "visita" ? "visit" : null,
    year: Number.isInteger(ano) && ano > 1800 ? ano : null,
    competition: competicao || null,
  });
  const filtered = Boolean(tipo || one(params.ano) || competicao);

  const kindHref = (value: string | null) => {
    const next = new URLSearchParams();
    if (value) next.set("tipo", value);
    if (one(params.ano)) next.set("ano", one(params.ano)!);
    if (competicao) next.set("competicao", competicao);
    return `/app/passaporte${next.size ? `?${next}` : ""}`;
  };
  const kinds = [
    { value: null, label: "Todos" },
    { value: "partida", label: "Partidas" },
    { value: "visita", label: "Visitas" },
  ];

  return (
    <>
      <Ticket orientation="horizontal" innerClassName="flex flex-col items-center gap-4 py-4 sm:flex-row sm:justify-between lg:px-10 lg:py-6">
        <Counters stamps={list.totals.stamps} stadiums={list.totals.stadiums} className="w-full gap-6 sm:w-auto [&>div:first-child]:pr-6" />
        <div className="hidden items-center gap-4 sm:flex">
          <div className="picote h-14 w-2" aria-hidden />
          <p className="rotulo-display text-sm leading-tight text-estadio">
            Futebol
            <br />
            conecta
            <br />
            pessoas
          </p>
          <KitIcon name="football-postmark" size={88} className="h-auto" />
        </div>
      </Ticket>

      {list.totals.stamps > 0 && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Tipo de carimbo" className="flex flex-wrap gap-2">
            {kinds.map((k) => {
              const active = (tipo ?? null) === k.value || (!k.value && tipo !== "partida" && tipo !== "visita");
              return (
                <Link
                  key={k.label}
                  href={kindHref(k.value)}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-12 min-w-28 items-center justify-center rounded-full border px-5 font-display text-lg",
                    active ? "border-ingresso bg-ingresso font-semibold text-estadio" : "border-estadio/30 bg-white text-estadio hover:bg-partida/50",
                  )}
                >
                  {k.label}
                </Link>
              );
            })}
            {list.years.length > 0 && (
              <FilterSelect
                param="ano"
                label="Ano"
                icon="calendar"
                allLabel="Todos os anos"
                options={list.years.map((y) => ({ value: String(y), label: String(y) }))}
              />
            )}
          </nav>
          {list.competitions.length > 0 && (
            <FilterSelect
              param="competicao"
              label="Competição"
              icon="trophy"
              allLabel="Todas as competições"
              options={list.competitions.map((c) => ({ value: c, label: c }))}
              className="lg:min-w-80"
            />
          )}
        </div>
      )}

      {list.items.length > 0 ? (
        <ul className="perfurado -mx-5 flex flex-col gap-3 bg-ingresso px-5 py-4 md:mx-0 md:rounded-ticket md:px-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:p-8 xl:grid-cols-3">
          {list.items.map((v) => (
            <li key={v.id}>
              <VisitStamp visit={v} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="papel flex flex-col items-center gap-3 rounded-2xl border border-dashed border-linha p-8 text-center">
          <KitIcon name="passport" size={56} />
          <p className="titulo-display text-2xl text-estadio">
            {filtered ? "Nenhum carimbo com esses filtros" : "Seu passaporte está em branco"}
          </p>
          <p className="max-w-md text-suave">
            {filtered
              ? "Mude os filtros ou veja todos os carimbos."
              : "Registre a primeira visita a um estádio ou uma partida que você assistiu ao vivo."}
          </p>
          {filtered && (
            <Link href="/app/passaporte" className="font-semibold text-estadio underline underline-offset-4">
              Ver todos
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-linha bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between lg:p-6">
        <p className="text-tinta">
          <span className="font-display text-lg font-semibold text-estadio">Cada ida ao estádio vira lembrança.</span>
          <br className="hidden sm:block" /> Registre visitas e partidas para completar sua coleção.
        </p>
        <ButtonLink href="/app/registrar" className="shrink-0 lg:min-w-72" icon={<KitIcon name="camera-ai" size={28} />}>
          Adicionar carimbo
        </ButtonLink>
      </div>
    </>
  );
}

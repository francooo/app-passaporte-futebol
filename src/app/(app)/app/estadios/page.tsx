import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { StadiumRow } from "@/components/catalog/stadium-bits";
import { KitIcon } from "@/components/ui/kit-icon";
import { getCountry, listStadiums, PAGE_SIZE } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Estádios" };

export default function EstadiosPage({ searchParams }: PageProps<"/app/estadios">) {
  return (
    <Suspense fallback={<p className="text-suave">Carregando estádios…</p>}>
      <EstadiosContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EstadiosContent({ searchParams }: Pick<PageProps<"/app/estadios">, "searchParams">) {
  const params = await searchParams;
  const iso3 = typeof params.pais === "string" ? params.pais.toUpperCase() : "BRA";
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const page = Math.max(0, Number.parseInt(typeof params.pagina === "string" ? params.pagina : "0", 10) || 0);

  const country = /^[A-Z]{3}$/.test(iso3) ? await getCountry(iso3) : null;
  if (!country) {
    return (
      <p className="text-suave">
        País não encontrado.{" "}
        <Link href="/app/mapa" className="font-semibold text-estadio underline">
          Voltar ao mapa
        </Link>
      </p>
    );
  }
  const result = await listStadiums({ country: iso3, q, page });
  const href = (p: number) => `/app/estadios?${new URLSearchParams({ pais: iso3, ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div>
        <Link href={`/app/mapa?pais=${iso3}`} className="inline-flex items-center gap-1 text-sm font-semibold text-estadio">
          <KitIcon name="back" size={18} /> Mapa
        </Link>
        <h1 className="titulo-display mt-2 text-4xl text-estadio lg:text-6xl">Estádios: {country.name}</h1>
        <p className="mt-1 text-suave">
          {result.total} {result.total === 1 ? "estádio" : "estádios"}
          {q ? ` para “${q}”` : ""} · do maior para o menor
        </p>
      </div>

      <form action="/app/estadios" role="search" className="flex gap-2 lg:max-w-xl">
        <input type="hidden" name="pais" value={iso3} />
        <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-linha bg-white px-4 focus-within:border-estadio">
          <KitIcon name="search" size={22} />
          <span className="sr-only">Buscar estádio ou cidade</span>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Buscar estádio ou cidade"
            className="min-w-0 flex-1 bg-transparent py-3 outline-none placeholder:text-suave"
          />
        </label>
        <button type="submit" className="min-h-12 rounded-xl bg-ingresso px-5 font-display text-lg font-semibold text-estadio">
          Buscar
        </button>
      </form>

      {result.items.length ? (
        <ol className="grid gap-3 lg:grid-cols-2">
          {result.items.map((s, i) => (
            <li key={s.id}>
              <StadiumRow stadium={s} position={q ? undefined : page * PAGE_SIZE + i + 1} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl border border-dashed border-linha p-4 text-suave">Nenhum estádio encontrado.</p>
      )}

      <nav aria-label="Paginação" className="flex items-center justify-between">
        {page > 0 ? (
          <Link href={href(page - 1)} className="rounded-xl border-2 border-estadio px-4 py-2 font-display font-semibold text-estadio">
            ‹ Anteriores
          </Link>
        ) : (
          <span />
        )}
        {result.nextPage != null && (
          <Link href={href(result.nextPage)} className="rounded-xl bg-ingresso px-4 py-2 font-display font-semibold text-estadio">
            Próximos ›
          </Link>
        )}
      </nav>
    </div>
  );
}

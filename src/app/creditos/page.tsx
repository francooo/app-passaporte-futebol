import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Suspense } from "react";
import { listPhotoCredits } from "@/lib/catalog/queries";

export const metadata: Metadata = { title: "Créditos das imagens" };

export default function CreditosPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 lg:gap-8 lg:py-12">
      <Link href="/" aria-label="Passaporte Esportivo — início">
        <Logo />
      </Link>
      <div>
        <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">Créditos</h1>
        <p className="mt-2 text-suave">
          As fotos dos estádios vêm do Wikimedia Commons e são usadas conforme a licença indicada por cada autor.
          Dados dos estádios: Wikidata (CC0). Endereços: © OpenStreetMap. Mapa: Natural Earth (domínio público).
        </p>
      </div>

      <section className="rounded-2xl border border-linha bg-white p-5">
        <h2 className="titulo-display text-2xl text-estadio">Fotos do kit visual</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-tinta">
          <li>Maracanã — Arne Müseler / arne-mueseler.com / CC BY-SA 3.0 DE (recortada)</li>
          <li>Allianz Parque — Leonef / CC BY-SA 4.0 (recortada e clareada)</li>
        </ul>
      </section>

      <Suspense fallback={<p className="text-suave">Carregando créditos…</p>}>
        <CatalogCredits />
      </Suspense>
    </main>
  );
}

async function CatalogCredits() {
  const credits = await listPhotoCredits({ pageSize: 300 });
  return (
    <section className="rounded-2xl border border-linha bg-white p-5">
      <h2 className="titulo-display text-2xl text-estadio">Fotos dos estádios</h2>
      <ul className="mt-3 flex flex-col divide-y divide-linha text-sm">
        {credits.map((c) => (
          <li key={c.pageUrl ?? c.stadium} className="py-2">
            <span className="font-semibold text-estadio">{c.stadium}</span>{" "}
            <span className="text-suave">({c.country})</span> — {c.author ?? "autor não informado"} /{" "}
            {c.licenseUrl ? (
              <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {c.license}
              </a>
            ) : (
              c.license
            )}
            {c.pageUrl && (
              <>
                {" · "}
                <a href={c.pageUrl} target="_blank" rel="noopener noreferrer" className="underline">
                  arquivo
                </a>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

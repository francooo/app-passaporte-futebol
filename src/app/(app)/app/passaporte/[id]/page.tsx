import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KitIcon } from "@/components/ui/kit-icon";
import { Stamp } from "@/components/ui/stamp";
import { Ticket } from "@/components/ui/ticket";
import { Scoreline } from "@/components/visits/team-crest";
import { DeleteVisit, VisitPhotos } from "@/components/visits/visit-manager";
import { formatDay } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/dal";
import { getVisit } from "@/lib/visits";

export const metadata: Metadata = { title: "Carimbo" };

export default function CarimboPage({ params, searchParams }: PageProps<"/app/passaporte/[id]">) {
  return (
    <Suspense fallback={<p className="text-suave">Carregando carimbo…</p>}>
      <Carimbo params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Carimbo({ params, searchParams }: PageProps<"/app/passaporte/[id]">) {
  const user = await getCurrentUser();
  const { id } = await params;
  const { fotos_falharam } = await searchParams;
  const v = await getVisit(user.id, id);
  if (!v) notFound();

  const isMatch = v.kind === "match";
  const where = [v.stadium.city, v.stadium.state && v.stadium.state !== v.stadium.city ? v.stadium.state : null].filter(Boolean).join(" - ") || v.stadium.country;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <Link href="/app/passaporte" className="inline-flex items-center gap-1 self-start text-sm font-semibold text-estadio">
        <KitIcon name="back" size={18} /> Meu Passaporte
      </Link>

      {typeof fotos_falharam === "string" && (
        <p role="status" className="rounded-xl border border-erro/40 bg-white p-3 text-erro">
          Carimbo criado, mas {fotos_falharam} foto(s) não foram enviadas. Tente adicioná-las de novo abaixo.
        </p>
      )}

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <Ticket className="lg:col-span-5" innerClassName="flex flex-col items-center gap-4 text-center">
          <Stamp name={v.stadium.name} place={where} photoUrl={v.coverUrl ?? v.stadium.thumbUrl} tone={isMatch ? "azul" : "verde"} size={260} />
          <div className="flex w-full flex-col items-center gap-2 border-t border-dashed border-linha pt-4">
            <span className={cn("rotulo-display rounded-md px-2 py-0.5 text-sm text-estadio", isMatch ? "bg-partida" : "bg-visita")}>
              {isMatch ? "Partida" : "Visita"}
            </span>
            <span className="font-display text-xl text-estadio">{formatDay(v.date).toUpperCase()}</span>
          </div>
        </Ticket>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div>
            <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">{v.stadium.name}</h1>
            <p className="mt-1 flex items-center gap-1 text-lg text-suave">
              <KitIcon name="location-pin" size={20} /> {where} · {v.stadium.country}
            </p>
            <Link href={`/app/estadios/${v.stadium.id}`} className="mt-2 inline-block text-sm font-semibold text-estadio underline underline-offset-4">
              Ver página do estádio
            </Link>
          </div>

          {isMatch && (v.home || v.away) && (
            <section aria-label="Resultado" className="rounded-2xl border border-linha bg-white p-4 lg:p-6">
              <Scoreline home={v.home} away={v.away} homeScore={v.homeScore} awayScore={v.awayScore} size="lg" />
              {v.competition && <p className="mt-2 text-center text-suave">{v.competition}</p>}
            </section>
          )}

          {v.note && (
            <section aria-labelledby="nota">
              <h2 id="nota" className="titulo-display text-2xl text-estadio">
                Anotação
              </h2>
              <p className="mt-1 whitespace-pre-line text-tinta">{v.note}</p>
            </section>
          )}

          <VisitPhotos visitId={v.id} photos={v.photos} />
          <DeleteVisit visitId={v.id} />
        </div>
      </div>
    </div>
  );
}

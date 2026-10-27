import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { StampCard } from "@/components/ui/stamp-card";
import { Ticket } from "@/components/ui/ticket";
import { cn } from "@/lib/cn";
import { demoVisits } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Meu Passaporte" };

function Counters({ stamps, stadiums, className }: { stamps: number; stadiums: number; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2", className)}>
      <div className="flex flex-row-reverse items-baseline justify-center gap-2 border-r border-linha">
        <dt className="font-display text-xl text-estadio">carimbos</dt>
        <dd className="titulo-display text-5xl text-estadio">{stamps}</dd>
      </div>
      <div className="flex flex-row-reverse items-baseline justify-center gap-2">
        <dt className="font-display text-xl text-estadio">estádios</dt>
        <dd className="titulo-display text-5xl text-estadio">{stadiums}</dd>
      </div>
    </dl>
  );
}

export default function PassaportePage() {
  const stamps = demoVisits.length;
  const stadiums = new Set(demoVisits.map((v) => v.stadium)).size;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="titulo-display text-5xl text-estadio lg:text-6xl">Meu Passaporte</h1>
          <p className="mt-1 font-display text-xl tracking-wide text-tinta lg:text-2xl">Suas visitas, suas histórias.</p>
        </div>

        {/* Desktop: contadores num ingresso deitado */}
        <Ticket orientation="horizontal" className="hidden lg:block" innerClassName="flex items-center gap-8 px-8 py-4">
          <Counters stamps={stamps} stadiums={stadiums} className="gap-6 [&>div:first-child]:pr-6" />
          <div className="picote h-14 w-2" aria-hidden />
          <p className="rotulo-display text-sm leading-tight text-estadio">
            O mundo
            <br />
            também
            <br />
            joga aqui
          </p>
          <KitIcon name="football-postmark" size={96} className="h-auto" />
        </Ticket>
      </div>

      <div className="perfurado -mx-5 flex flex-col gap-3 bg-ingresso px-5 py-4 md:mx-0 md:rounded-ticket md:px-6 lg:gap-6 lg:p-8">
        <div className="mordida papel rounded-2xl py-4 lg:hidden">
          <Counters stamps={stamps} stadiums={stadiums} />
        </div>

        <div className="hidden items-center justify-between lg:flex">
          <h2 className="titulo-display text-3xl text-estadio">Carimbos colecionados</h2>
          <ButtonLink
            href="/app/passaporte"
            className="border-2 border-estadio bg-marfim hover:bg-white"
            icon={<KitIcon name="camera-ai" size={28} />}
          >
            Adicionar carimbo
          </ButtonLink>
        </div>

        <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          {demoVisits.map((v) => {
            const props = {
              href: "/app/passaporte",
              stadium: v.stadium,
              city: v.city,
              stateCode: v.stateCode,
              kind: v.kind,
              date: v.date,
              photoUrl: v.photoUrl,
              tone: v.tone,
            };
            return (
              <li key={v.id}>
                <div className="lg:hidden">
                  <StampCard {...props} />
                </div>
                <div className="hidden h-full lg:block">
                  <StampCard {...props} layout="tile" />
                </div>
              </li>
            );
          })}
        </ul>

        <ButtonLink
          href="/app/passaporte"
          className="border-2 border-ingresso-escuro lg:hidden"
          icon={<KitIcon name="camera-ai" size={30} />}
        >
          Adicionar carimbo
        </ButtonLink>
      </div>
    </div>
  );
}

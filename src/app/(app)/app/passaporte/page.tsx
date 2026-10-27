import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { StampCard } from "@/components/ui/stamp-card";
import { demoVisits } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Meu Passaporte" };

export default function PassaportePage() {
  const stamps = demoVisits.length;
  const stadiums = new Set(demoVisits.map((v) => v.stadium)).size;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="titulo-display text-5xl text-estadio">Meu Passaporte</h1>
        <p className="mt-1 font-display text-xl tracking-wide text-tinta">Suas visitas, suas histórias.</p>
      </div>

      <div className="perfurado -mx-5 flex flex-col gap-3 bg-ingresso px-5 py-4">
        <dl className="mordida papel grid grid-cols-2 rounded-2xl py-4">
          <div className="flex items-baseline justify-center gap-2 border-r border-linha">
            <dt className="order-2 font-display text-xl text-estadio">carimbos</dt>
            <dd className="titulo-display text-5xl text-estadio">{stamps}</dd>
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <dt className="order-2 font-display text-xl text-estadio">estádios</dt>
            <dd className="titulo-display text-5xl text-estadio">{stadiums}</dd>
          </div>
        </dl>

        <ul className="flex flex-col gap-3">
          {demoVisits.map((v) => (
            <li key={v.id}>
              <StampCard
                href="/app/passaporte"
                stadium={v.stadium}
                city={v.city}
                stateCode={v.stateCode}
                kind={v.kind}
                date={v.date}
                photoUrl={v.photoUrl}
                tone={v.tone}
              />
            </li>
          ))}
        </ul>

        <ButtonLink
          href="/app/passaporte"
          className="border-2 border-ingresso-escuro"
          icon={<KitIcon name="camera-ai" size={30} />}
        >
          Adicionar carimbo
        </ButtonLink>
      </div>
    </div>
  );
}

import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Stamp } from "@/components/ui/stamp";
import { Ticket } from "@/components/ui/ticket";
import { demoVisits } from "@/lib/demo-data";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
      {/* Mobile: ingresso centralizado. Desktop: coluna de texto. */}
      <Ticket className="lg:hidden" innerClassName="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <Logo size="lg" />
        <Pitch />
      </Ticket>

      <div className="hidden flex-col gap-8 lg:flex">
        <Logo size="xl" />
        <Pitch large />
      </div>

      {/* Desktop: composição com mapa e carimbos */}
      <div className="relative hidden lg:block">
        <Ticket innerClassName="p-8 pb-16">
          <p className="rotulo-display mb-4 text-right text-sm text-estadio">O mundo também joga aqui</p>
          <Image src="/map/world-map.svg" alt="" width={720} height={320} className="h-auto w-full" unoptimized priority />
        </Ticket>
        <div className="absolute -bottom-12 left-6 flex gap-2" aria-hidden>
          {demoVisits.map((v, i) => (
            <Stamp
              key={v.id}
              name={v.stadium}
              place={`${v.city} - ${v.stateCode}`}
              photoUrl={v.photoUrl}
              tone={v.tone}
              size={120}
              className={i % 2 ? "rotate-6" : "-rotate-6"}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function Pitch({ large = false }: { large?: boolean }) {
  return (
    <>
      <p className={large ? "font-display text-4xl tracking-wide text-estadio" : "font-display text-2xl tracking-wide text-estadio"}>
        Mais que futebol, mais histórias.
      </p>
      <p className={large ? "max-w-lg text-lg text-tinta" : "text-tinta"}>
        Registre estádios, partidas e visitas. Cada estádio vira um carimbo no seu passaporte.
      </p>
      <div className={large ? "flex gap-4" : "flex w-full flex-col gap-3"}>
        <ButtonLink href="/cadastro" className={large ? "px-8" : undefined}>
          Criar conta
        </ButtonLink>
        <ButtonLink href="/login" variant="secundario" className={large ? "px-8" : undefined}>
          Entrar
        </ButtonLink>
      </div>
    </>
  );
}

import type { ReactNode } from "react";
import { KitIcon } from "@/components/ui/kit-icon";
import { Logo } from "@/components/ui/logo";
import { Ticket } from "@/components/ui/ticket";

const arquibancada =
  "bg-[radial-gradient(ellipse_at_top,#1d5245_0%,#123a32_55%,#0b2620_100%)]";

/**
 * Fluxo de acesso. Mobile: fundo de arquibancada + ingresso centralizado.
 * Desktop: painel de marca à esquerda e o mesmo ingresso à direita, sobre papel.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`relative flex min-h-dvh flex-col bg-estadio lg:grid lg:grid-cols-2 ${arquibancada}`}>
      {/* Painel de marca (desktop) */}
      <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-14 xl:p-20">
        <p className="rotulo-display text-sm text-ingresso">Passaporte Esportivo</p>

        <div>
          <h2 className="titulo-display max-w-lg text-6xl uppercase text-marfim xl:text-7xl">
            Futebol conecta pessoas a lugares <span className="text-ingresso">incríveis</span>
          </h2>
          <p className="mt-6 max-w-md text-lg text-marfim/80">
            Registre estádios, partidas e visitas. Cada estádio vira um carimbo no seu passaporte.
          </p>
        </div>

        <div className="flex items-end justify-between gap-6">
          <p className="titulo-display text-3xl uppercase text-ingresso">
            Mais que futebol
            <br />
            mais histórias
          </p>
          <div className="perfurado grid size-28 shrink-0 place-items-center rounded-xl bg-ingresso">
            <KitIcon name="stamp-partida" size={72} />
          </div>
        </div>
      </aside>

      {/* Coluna do formulário */}
      <div className="relative flex flex-1 flex-col lg:papel lg:justify-center">
        <header className="px-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center lg:hidden">
          <p className="rotulo-display text-sm text-ingresso">Futebol conecta pessoas a lugares incríveis</p>
        </header>

        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6 lg:flex-none lg:py-12">
          <Ticket innerClassName="px-6 py-8">
            <Logo size="lg" className="justify-center" />
            <hr className="mx-auto my-4 w-3/4 border-estadio" />
            {children}
          </Ticket>
        </main>

        <footer className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
          <p className="titulo-display text-xl uppercase text-ingresso">
            Mais que futebol
            <br />
            mais histórias
          </p>
        </footer>
      </div>
    </div>
  );
}

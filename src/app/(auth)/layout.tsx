import type { ReactNode } from "react";
import { Ticket } from "@/components/ui/ticket";
import { Logo } from "@/components/ui/logo";

/** Fluxo de acesso: fundo de arquibancada + painel em forma de ingresso. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col bg-estadio">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#1d5245_0%,#123a32_55%,#0b2620_100%)]"
      />
      <header className="relative px-6 pt-[max(1.5rem,env(safe-area-inset-top))] text-center">
        <p className="rotulo-display text-sm text-ingresso">Futebol conecta pessoas a lugares incríveis</p>
      </header>

      <main className="relative mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Ticket innerClassName="px-6 py-8">
          <Logo size="lg" className="justify-center" />
          <hr className="mx-auto my-4 w-3/4 border-estadio" />
          {children}
        </Ticket>
      </main>

      <footer className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="titulo-display text-xl uppercase text-ingresso">
          Mais que futebol
          <br />
          mais histórias
        </p>
      </footer>
    </div>
  );
}

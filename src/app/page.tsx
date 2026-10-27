import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Ticket } from "@/components/ui/ticket";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <Ticket innerClassName="flex flex-col items-center gap-5 px-6 py-10 text-center">
        <Logo size="lg" />
        <p className="font-display text-2xl tracking-wide text-estadio">Mais que futebol, mais histórias.</p>
        <p className="text-tinta">
          Registre estádios, partidas e visitas. Cada estádio vira um carimbo no seu passaporte.
        </p>
        <div className="flex w-full flex-col gap-3">
          <ButtonLink href="/cadastro">Criar conta</ButtonLink>
          <ButtonLink href="/login" variant="secundario">
            Entrar
          </ButtonLink>
        </div>
      </Ticket>
    </main>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { KitIcon, type KitIconName } from "@/components/ui/kit-icon";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Perfil" };

const sections: Array<{ title: string; description: string; icon: KitIconName }> = [
  { title: "Dados pessoais", description: "Nome, foto, bio, nacionalidade e estado.", icon: "profile" },
  { title: "Time do coração", description: "Escolha seu clube ou seleção.", icon: "crest-stamp" },
  { title: "Idioma", description: "Português, Español ou English.", icon: "map" },
  { title: "Privacidade", description: "Defina quem pode ver suas visitas.", icon: "lock" },
];

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <h1 className="titulo-display text-4xl text-estadio lg:text-6xl">Perfil</h1>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-8">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-white/60 lg:h-72" />}>
            <ProfileCard />
          </Suspense>
          <form action={signOutAction}>
            <Button type="submit" variant="secundario" className="w-full">
              Sair
            </Button>
          </form>
        </div>

        <section aria-labelledby="config" className="flex flex-col gap-4 lg:col-span-8">
          <h2 id="config" className="titulo-display text-2xl text-estadio lg:text-3xl">
            Configurações
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {sections.map((s) => (
              <li key={s.title} className="flex items-start gap-4 rounded-2xl border border-linha bg-white p-5">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-partida">
                  <KitIcon name={s.icon} size={26} />
                </span>
                <div>
                  <h3 className="titulo-display text-xl text-estadio">{s.title}</h3>
                  <p className="text-sm text-suave">{s.description}</p>
                  <p className="rotulo-display mt-2 text-xs text-suave">Em breve</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

async function ProfileCard() {
  const user = await getCurrentUser();
  const premium = user.premiumUntil && user.premiumUntil > new Date();
  return (
    <div className="papel flex items-center gap-4 rounded-2xl border border-linha p-4 lg:flex-col lg:p-8 lg:text-center">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-estadio bg-partida lg:size-28">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externo do Google
          <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <KitIcon name="profile" size={36} className="lg:size-14" />
        )}
      </span>
      <div className="min-w-0 lg:w-full">
        <p className="titulo-display truncate text-2xl text-estadio lg:text-3xl">{user.name ?? "Torcedor"}</p>
        <p className="truncate text-sm text-suave">{user.email}</p>
        <p className="rotulo-display mt-2 inline-block rounded-md bg-visita px-2 py-0.5 text-xs text-estadio">
          {premium ? "Premium" : "Plano gratuito"}
        </p>
      </div>
    </div>
  );
}

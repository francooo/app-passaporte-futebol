import type { Metadata } from "next";
import { Suspense } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { KitIcon } from "@/components/ui/kit-icon";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Perfil" };

export default function PerfilPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="titulo-display text-4xl text-estadio">Perfil</h1>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-white/60" />}>
        <ProfileCard />
      </Suspense>
      <form action={signOutAction}>
        <Button type="submit" variant="secundario" className="w-full">
          Sair
        </Button>
      </form>
    </div>
  );
}

async function ProfileCard() {
  const user = await getCurrentUser();
  const premium = user.premiumUntil && user.premiumUntil > new Date();
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-linha bg-white p-4">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-partida">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar externo do Google
          <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <KitIcon name="profile" size={36} />
        )}
      </span>
      <div className="min-w-0">
        <p className="titulo-display truncate text-2xl text-estadio">{user.name ?? "Torcedor"}</p>
        <p className="truncate text-sm text-suave">{user.email}</p>
        <p className="rotulo-display mt-1 text-xs text-estadio">{premium ? "Premium" : "Plano gratuito"}</p>
      </div>
    </div>
  );
}

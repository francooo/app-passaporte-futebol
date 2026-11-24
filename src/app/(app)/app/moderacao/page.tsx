import type { Metadata } from "next";
import { Suspense } from "react";
import { ModerationBoard } from "@/components/moderation/moderation-board";
import { requireModerator } from "@/lib/dal";
import { moderationQueue } from "@/lib/moderation";

export const metadata: Metadata = { title: "Moderação" };

/** Locais e times cadastrados por usuários aguardando aprovação (só moderadores). */
export default function ModeracaoPage() {
  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div>
        <h1 className="titulo-display text-5xl text-estadio lg:text-6xl">Moderação</h1>
        <p className="mt-1 font-display text-xl tracking-wide text-tinta">Locais e times cadastrados pelos usuários.</p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white/60" />}>
        <Queue />
      </Suspense>
    </div>
  );
}

async function Queue() {
  await requireModerator();
  return <ModerationBoard queue={await moderationQueue()} />;
}
